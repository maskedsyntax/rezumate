import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import initSchema from "../migrations/0001_init.sql?raw";
import retriesSchema from "../migrations/0002_retries.sql?raw";
import worker from "../src/index";
import { base64UrlEncode } from "../src/http";
import { issueSessionToken, verifySessionToken } from "../src/session";

const INSTALL_ID = "3f1c2b7e-8d4a-4c1e-9b2f-1a2b3c4d5e6f";
const realFetch = globalThis.fetch;

async function resetDatabase() {
  for (const table of ["users", "pro_grants", "subscriptions", "usage", "retries"]) {
    await env.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
  const statements = [initSchema, retriesSchema]
    .join("\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await env.DB.prepare(statement).run();
  }
}

function call(path: string, init: RequestInit = {}, testEnv: Env = env) {
  return worker.fetch(new Request(`https://ai.test${path}`, init), testEnv);
}

async function startSession(): Promise<string> {
  const response = await call("/v1/session", {
    method: "POST",
    body: JSON.stringify({ installId: INSTALL_ID }),
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

function post(path: string, token: string, body: unknown, testEnv: Env = env) {
  return call(
    path,
    { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
    testEnv,
  );
}

function openAIReply(payload: unknown) {
  return Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(payload) }] }],
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://ai.test")) return realFetch(input, init);
    return handler(url, init);
  });
}

type Access = { trialRemaining: number; bonusRemaining: number; monthlyRemaining: number; subscriptionActive: boolean; totalRemaining: number };

beforeEach(resetDatabase);
afterEach(() => vi.restoreAllMocks());

describe("sessions", () => {
  it("creates a user with the free trial", async () => {
    const response = await call("/v1/session", { method: "POST", body: JSON.stringify({ installId: INSTALL_ID }) });
    const body = (await response.json()) as { token: string; access: Access };
    expect(body.access.trialRemaining).toBe(3);
    expect(await verifySessionToken(body.token, env.SESSION_SECRET)).toBe(INSTALL_ID);
  });

  it("does not grant a second trial when the same install starts a new session", async () => {
    const token = await startSession();
    mockFetch(() => openAIReply({ rewrites: ["Led onboarding"] }));
    await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" });

    const again = await call("/v1/session", { method: "POST", body: JSON.stringify({ installId: INSTALL_ID }) });
    expect(((await again.json()) as { access: Access }).access.trialRemaining).toBe(2);
  });

  it("rejects malformed install ids", async () => {
    const response = await call("/v1/session", { method: "POST", body: JSON.stringify({ installId: "abc" }) });
    expect(response.status).toBe(400);
  });

  it("rejects missing, forged, and expired tokens", async () => {
    expect((await post("/v1/ai/rewrite-bullet", "nope", { bullet: "x" })).status).toBe(401);
    const forged = await issueSessionToken(INSTALL_ID, "a-different-secret");
    expect((await post("/v1/ai/rewrite-bullet", forged, { bullet: "x" })).status).toBe(401);
    const expired = await issueSessionToken(INSTALL_ID, env.SESSION_SECRET, Date.now() - 31 * 24 * 3600 * 1000);
    await expect(verifySessionToken(expired, env.SESSION_SECRET)).rejects.toMatchObject({ code: "session_expired" });
  });
});

describe("AI tasks", () => {
  it("calls OpenAI without storing data and spends one trial action", async () => {
    const token = await startSession();
    const fetchSpy = mockFetch(() => openAIReply({ rewrites: ["Led onboarding for 4 engineers"] }));

    const response = await post("/v1/ai/rewrite-bullet", token, {
      bullet: "Helped with onboarding for 4 engineers",
      jobTitle: "Engineering Manager",
      allowedKeywords: ["Mentoring"],
    });
    const body = (await response.json()) as { result: { rewrites: string[] }; access: Access };

    expect(response.status).toBe(200);
    expect(body.result.rewrites).toEqual(["Led onboarding for 4 engineers"]);
    expect(body.access.trialRemaining).toBe(2);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const sent = JSON.parse(String(init?.body));
    expect(sent.store).toBe(false);
    expect(sent.model).toBe(env.OPENAI_WRITING_MODEL);
    expect(sent.reasoning).toEqual({ effort: env.OPENAI_WRITING_EFFORT });
    expect(sent.max_output_tokens).toBeGreaterThanOrEqual(16000);
    expect(sent.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(sent.input[1].content).toContain("Mentoring");
  });

  it("does not charge for job insights and uses the cheap model", async () => {
    const token = await startSession();
    const fetchSpy = mockFetch(() => openAIReply({ requirements: [{ term: "Terraform", importance: "required" }] }));
    const response = await post("/v1/ai/job-insights", token, { jobDescription: "We use Terraform." });
    const body = (await response.json()) as { access: Access; retryToken?: string };
    expect(body.access.trialRemaining).toBe(3);
    expect(body.retryToken).toBeUndefined();
    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
    expect(sent.model).toBe(env.OPENAI_EXTRACT_MODEL);
    expect(sent.reasoning).toEqual({ effort: env.OPENAI_EXTRACT_EFFORT });
  });

  it("asks free bullet questions and feeds the answers into the rewrite", async () => {
    const token = await startSession();
    const fetchSpy = mockFetch((_, init) => {
      const sent = JSON.parse(String(init?.body));
      return sent.text.format.name === "bullet_questions"
        ? openAIReply({ questions: [{ question: "What improved?", placeholder: "e.g. latency" }] })
        : openAIReply({ rewrites: ["Cut checkout latency from 800ms to 300ms"] });
    });

    const questions = (await (await post("/v1/ai/bullet-questions", token, { bullet: "Worked on checkout" })).json()) as {
      result: { questions: unknown[] };
      access: Access;
    };
    expect(questions.result.questions).toHaveLength(1);
    expect(questions.access.trialRemaining).toBe(3);

    const rewrite = await post("/v1/ai/rewrite-bullet", token, {
      bullet: "Worked on checkout",
      details: [{ question: "What improved?", answer: "p95 latency 800ms to 300ms" }],
    });
    expect(rewrite.status).toBe(200);
    const sent = JSON.parse(String(fetchSpy.mock.calls[1][1]?.body));
    expect(sent.input[1].content).toContain("A: p95 latency 800ms to 300ms");
  });

  it("rejects malformed details", async () => {
    const token = await startSession();
    const tooMany = Array.from({ length: 4 }, () => ({ question: "q", answer: "a" }));
    expect((await post("/v1/ai/rewrite-bullet", token, { bullet: "x", details: tooMany })).status).toBe(400);
    expect((await post("/v1/ai/rewrite-bullet", token, { bullet: "x", details: [{ question: "q" }] })).status).toBe(400);
  });

  it("keeps job insights available after the trial is used up, but not bullet questions", async () => {
    const token = await startSession();
    mockFetch((_, init) => {
      const name = JSON.parse(String(init?.body)).text.format.name;
      if (name === "job_requirements") return openAIReply({ requirements: [] });
      if (name === "bullet_questions") return openAIReply({ questions: [] });
      return openAIReply({ rewrites: ["Contributed to onboarding"] });
    });
    for (let i = 0; i < 3; i++) await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" });

    expect((await post("/v1/ai/job-insights", token, { jobDescription: "Go" })).status).toBe(200);
    expect((await post("/v1/ai/bullet-questions", token, { bullet: "Helped with onboarding" })).status).toBe(402);
  });

  it("gives one free retry per charged result", async () => {
    const token = await startSession();
    mockFetch(() => openAIReply({ rewrites: ["Contributed to onboarding"] }));
    const bullet = { bullet: "Helped with onboarding" };

    const first = (await (await post("/v1/ai/rewrite-bullet", token, bullet)).json()) as { access: Access; retryToken: string };
    expect(first.access.trialRemaining).toBe(2);
    expect(first.retryToken).toBeTruthy();

    const retry = (await (await post("/v1/ai/rewrite-bullet", token, { ...bullet, retryOf: first.retryToken })).json()) as {
      access: Access;
      retryToken?: string;
    };
    expect(retry.access.trialRemaining).toBe(2);
    expect(retry.retryToken).toBeUndefined();

    // A used token, or one for another task, is charged normally.
    const reused = (await (await post("/v1/ai/rewrite-bullet", token, { ...bullet, retryOf: first.retryToken })).json()) as { access: Access };
    expect(reused.access.trialRemaining).toBe(1);
    const other = (await (await post("/v1/ai/rewrite-bullet", token, bullet)).json()) as { retryToken: string };
    mockFetch(() => openAIReply({ letter: "Dear Hiring Manager," }));
    const crossTask = await post("/v1/ai/cover-letter", token, { resume: "r", jobDescription: "j", retryOf: other.retryToken });
    expect(crossTask.status).toBe(402);
  });

  it("lets a retry through even when the last action was just spent", async () => {
    const token = await startSession();
    mockFetch(() => openAIReply({ rewrites: ["Contributed to onboarding"] }));
    let last: { retryToken: string } = { retryToken: "" };
    for (let i = 0; i < 3; i++) {
      last = (await (await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" })).json()) as { retryToken: string };
    }
    const retry = await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding", retryOf: last.retryToken });
    expect(retry.status).toBe(200);
  });

  it("does not charge when the response is cut short", async () => {
    const token = await startSession();
    mockFetch(() => Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }));
    const response = await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" });
    expect(response.status).toBe(502);
    const access = await call("/v1/access", { headers: { authorization: `Bearer ${token}` } });
    expect(((await access.json()) as { access: Access }).access.trialRemaining).toBe(3);
  });

  it("does not charge when OpenAI fails", async () => {
    const token = await startSession();
    mockFetch(() => new Response("upstream down", { status: 500 }));
    const response = await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" });
    expect(response.status).toBe(502);
    const access = await call("/v1/access", { headers: { authorization: `Bearer ${token}` } });
    expect(((await access.json()) as { access: Access }).access.trialRemaining).toBe(3);
  });

  it("returns 402 once the trial is used up", async () => {
    const token = await startSession();
    mockFetch(() => openAIReply({ rewrites: ["Led onboarding"] }));
    for (let i = 0; i < 3; i++) {
      expect((await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" })).status).toBe(200);
    }
    const blocked = await post("/v1/ai/rewrite-bullet", token, { bullet: "Helped with onboarding" });
    expect(blocked.status).toBe(402);
  });

  it("rejects oversized input before calling OpenAI", async () => {
    const token = await startSession();
    const fetchSpy = mockFetch(() => openAIReply({}));
    const response = await post("/v1/ai/rewrite-bullet", token, { bullet: "x".repeat(601) });
    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("enforces the daily request limit", async () => {
    const token = await startSession();
    mockFetch(() => openAIReply({ requirements: [] }));
    const limitedEnv = { ...env, DAILY_REQUEST_LIMIT: "2" } as Env;
    expect((await post("/v1/ai/job-insights", token, { jobDescription: "Go" }, limitedEnv)).status).toBe(200);
    expect((await post("/v1/ai/job-insights", token, { jobDescription: "Go" }, limitedEnv)).status).toBe(200);
    expect((await post("/v1/ai/job-insights", token, { jobDescription: "Go" }, limitedEnv)).status).toBe(429);
  });
});

describe("entitlement sync", () => {
  async function appleEnv(): Promise<Env> {
    const keys = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const pkcs8 = (await crypto.subtle.exportKey("pkcs8", keys.privateKey)) as ArrayBuffer;
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(pkcs8)))}\n-----END PRIVATE KEY-----`;
    return { ...env, APPLE_ISSUER_ID: "issuer", APPLE_IAP_KEY_ID: "KEY123", APPLE_IAP_PRIVATE_KEY: pem } as Env;
  }

  function signedTransaction(fields: Record<string, unknown>) {
    const part = (value: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
    return Response.json({ signedTransactionInfo: `${part({ alg: "ES256" })}.${part(fields)}.sig` });
  }

  it("grants AI actions once for a lifetime Pro purchase, even when synced again", async () => {
    const token = await startSession();
    const testEnv = await appleEnv();
    mockFetch((url) => {
      expect(url).toBe("https://api.storekit.itunes.apple.com/inApps/v1/transactions/1000");
      return signedTransaction({
        transactionId: "1000",
        originalTransactionId: "1000",
        bundleId: env.BUNDLE_ID,
        productId: env.PRO_PRODUCT_ID,
      });
    });

    const first = await post("/v1/entitlements/sync", token, { transactionIds: ["1000"] }, testEnv);
    expect(((await first.json()) as { access: Access }).access.bonusRemaining).toBe(25);
    const second = await post("/v1/entitlements/sync", token, { transactionIds: ["1000"] }, testEnv);
    expect(((await second.json()) as { access: Access }).access.bonusRemaining).toBe(25);
  });

  it("activates the monthly allowance for a subscription and falls back to sandbox", async () => {
    const token = await startSession();
    const testEnv = await appleEnv();
    mockFetch((url) => {
      if (url.includes("storekit-sandbox")) {
        return signedTransaction({
          transactionId: "2001",
          originalTransactionId: "2000",
          bundleId: env.BUNDLE_ID,
          productId: "rezumate_ai_monthly",
          expiresDate: Date.now() + 86_400_000,
        });
      }
      return new Response("not found", { status: 404 });
    });

    const response = await post("/v1/entitlements/sync", token, { transactionIds: ["2001"] }, testEnv);
    const { access } = (await response.json()) as { access: Access };
    expect(access.subscriptionActive).toBe(true);
    expect(access.monthlyRemaining).toBe(300);
  });

  it("ignores transactions for other apps", async () => {
    const token = await startSession();
    const testEnv = await appleEnv();
    mockFetch(() =>
      signedTransaction({ transactionId: "3000", originalTransactionId: "3000", bundleId: "com.other.app", productId: env.PRO_PRODUCT_ID }),
    );
    const response = await post("/v1/entitlements/sync", token, { transactionIds: ["3000"] }, testEnv);
    expect(((await response.json()) as { access: Access }).access.bonusRemaining).toBe(0);
  });

  it("removes the grant when Apple reports a refund", async () => {
    const token = await startSession();
    const testEnv = await appleEnv();
    let revoked = false;
    mockFetch(() =>
      signedTransaction({
        transactionId: "4000",
        originalTransactionId: "4000",
        bundleId: env.BUNDLE_ID,
        productId: env.PRO_PRODUCT_ID,
        ...(revoked ? { revocationDate: Date.now() } : {}),
      }),
    );
    await post("/v1/entitlements/sync", token, { transactionIds: ["4000"] }, testEnv);
    revoked = true;
    const response = await post("/v1/entitlements/sync", token, { transactionIds: ["4000"] }, testEnv);
    expect(((await response.json()) as { access: Access }).access.bonusRemaining).toBe(0);
  });
});
