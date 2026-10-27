import { checkDeviceAndClaimTrial, fetchTransaction } from "./apple";
import { errorResponse, HttpError, readJson, requireString, requireStringArray } from "./http";
import {
  accessStatus,
  consumeAction,
  consumeRetry,
  createUser,
  hasRetry,
  issueRetry,
  ledgerConfig,
  linkProPurchase,
  linkSubscription,
  recordRequest,
  revokeTransaction,
  userExists,
} from "./ledger";
import { generateStructured, type ModelChoice } from "./openai";
import { authenticate, issueSessionToken } from "./session";
import { TASKS, type TaskDefinition } from "./tasks";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname === "/v1/session") return await createSession(request, env);
      if (request.method === "GET" && url.pathname === "/v1/access") return await getAccess(request, env);
      if (request.method === "POST" && url.pathname === "/v1/entitlements/sync") return await syncEntitlements(request, env);

      const taskMatch = /^\/v1\/ai\/([a-z-]+)$/.exec(url.pathname);
      if (request.method === "POST" && taskMatch) return await runTask(taskMatch[1], request, env);

      return Response.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 });
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      console.error(JSON.stringify({ message: "unhandled error", path: url.pathname, error: error instanceof Error ? error.message : String(error) }));
      return Response.json({ error: { code: "internal", message: "Something went wrong." } }, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

/** Exchanges the app's install id (plus a DeviceCheck token) for a session token. */
async function createSession(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const installId = requireString(body.installId, "installId", 64).toLowerCase();
  if (!UUID_PATTERN.test(installId)) throw new HttpError(400, "invalid_input", "installId must be a UUID.");

  const config = ledgerConfig(env);
  const mode = env.DEVICECHECK_MODE;
  let trialAlreadyUsed = false;

  if (mode !== "off") {
    const deviceToken = requireString(body.deviceToken, "deviceToken", 8192);
    if (!env.APPLE_TEAM_ID || !env.APPLE_DEVICECHECK_KEY_ID || !env.APPLE_DEVICECHECK_PRIVATE_KEY) {
      throw new HttpError(500, "misconfigured", "DeviceCheck credentials are not configured.");
    }
    const isNewUser = !(await userExists(env.DB, installId));
    if (isNewUser) {
      ({ trialAlreadyUsed } = await checkDeviceAndClaimTrial(deviceToken, {
        teamId: env.APPLE_TEAM_ID,
        keyId: env.APPLE_DEVICECHECK_KEY_ID,
        privateKey: env.APPLE_DEVICECHECK_PRIVATE_KEY,
        development: mode === "development",
      }));
    }
  }

  await createUser(env.DB, installId, trialAlreadyUsed ? 0 : config.trialActions);
  const token = await issueSessionToken(installId, env.SESSION_SECRET);
  return Response.json({ token, access: await accessStatus(env.DB, installId, config) });
}

async function getAccess(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.SESSION_SECRET);
  return Response.json({ access: await accessStatus(env.DB, userId, ledgerConfig(env)) });
}

/** Verifies the app's current App Store transactions with Apple and links them to this user. */
async function syncEntitlements(request: Request, env: Env): Promise<Response> {
  const userId = await authenticate(request, env.SESSION_SECRET);
  const body = await readJson(request);
  const transactionIds = requireStringArray(body.transactionIds, "transactionIds", 10, 32);
  const config = ledgerConfig(env);

  if (transactionIds.length > 0) {
    if (!env.APPLE_ISSUER_ID || !env.APPLE_IAP_KEY_ID || !env.APPLE_IAP_PRIVATE_KEY) {
      throw new HttpError(500, "misconfigured", "App Store credentials are not configured.");
    }
    const subscriptionProducts = new Set(env.SUBSCRIPTION_PRODUCT_IDS.split(",").map((id) => id.trim()));

    for (const transactionId of transactionIds) {
      const transaction = await fetchTransaction(transactionId, {
        issuerId: env.APPLE_ISSUER_ID,
        keyId: env.APPLE_IAP_KEY_ID,
        privateKey: env.APPLE_IAP_PRIVATE_KEY,
        bundleId: env.BUNDLE_ID,
      });
      if (!transaction || transaction.bundleId !== env.BUNDLE_ID) continue;

      if (transaction.revocationDate) {
        await revokeTransaction(env.DB, transaction.originalTransactionId);
      } else if (transaction.productId === env.PRO_PRODUCT_ID) {
        await linkProPurchase(env.DB, userId, transaction.originalTransactionId, config);
      } else if (subscriptionProducts.has(transaction.productId) && transaction.expiresDate) {
        await linkSubscription(env.DB, userId, transaction.originalTransactionId, transaction.productId, transaction.expiresDate);
      }
    }
  }

  return Response.json({ access: await accessStatus(env.DB, userId, config) });
}

async function runTask(name: string, request: Request, env: Env): Promise<Response> {
  const task = TASKS[name];
  if (!task) throw new HttpError(404, "not_found", "Unknown AI task.");

  const userId = await authenticate(request, env.SESSION_SECRET);
  const config = ledgerConfig(env);
  const input = await readJson(request);
  const structured = task.build(input);
  const retryOf = task.charged ? requireString(input.retryOf, "retryOf", 64, { optional: true }) : undefined;
  const isRetry = retryOf ? await hasRetry(env.DB, userId, name, retryOf) : false;

  if (task.requiresAccess && !isRetry) {
    const before = await accessStatus(env.DB, userId, config);
    if (before.totalRemaining <= 0) {
      throw new HttpError(402, "no_ai_access", "No AI actions left. Subscribe to keep using AI.");
    }
  }
  await recordRequest(env.DB, userId, config);

  const choice = modelFor(task, env);
  const { result, usage } = await generateStructured<Record<string, unknown>>(env, structured, choice);

  // Charge only after a successful response, so failures never cost the user an action.
  // A charged result comes with one free retry; the retry itself does not.
  let retryToken: string | undefined;
  let charged = false;
  if (task.charged && !(retryOf && isRetry && (await consumeRetry(env.DB, userId, name, retryOf)))) {
    if (!(await consumeAction(env.DB, userId, config))) {
      throw new HttpError(402, "no_ai_access", "No AI actions left. Subscribe to keep using AI.");
    }
    charged = true;
    retryToken = await issueRetry(env.DB, userId, name);
  }

  console.log(JSON.stringify({ message: "ai task", task: name, model: choice.model, effort: choice.effort, charged, retry: isRetry, usage }));
  return Response.json({ result, access: await accessStatus(env.DB, userId, config), retryToken });
}

function modelFor(task: TaskDefinition, env: Env): ModelChoice {
  return task.tier === "writing"
    ? { model: env.OPENAI_WRITING_MODEL, effort: env.OPENAI_WRITING_EFFORT }
    : { model: env.OPENAI_EXTRACT_MODEL, effort: env.OPENAI_EXTRACT_EFFORT };
}
