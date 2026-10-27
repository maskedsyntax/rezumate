import { base64UrlDecode, base64UrlEncode, HttpError } from "./http";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** Issues a signed `userId.expiry.signature` token. */
export async function issueSessionToken(userId: string, secret: string, now = Date.now()): Promise<string> {
  const expiry = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiry}`;
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${base64UrlEncode(signature)}`;
}

/** Returns the user id for a valid, unexpired token. Signature check is constant time. */
export async function verifySessionToken(token: string, secret: string, now = Date.now()): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 3) throw unauthorized();
  const [userId, expiryText, signatureText] = parts;

  let signature: Uint8Array;
  try {
    signature = base64UrlDecode(signatureText);
  } catch {
    throw unauthorized();
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signature,
    encoder.encode(`${userId}.${expiryText}`),
  );
  if (!valid) throw unauthorized();

  const expiry = Number(expiryText);
  if (!Number.isFinite(expiry) || expiry * 1000 < now) {
    throw new HttpError(401, "session_expired", "Session expired.");
  }
  return userId;
}

export async function authenticate(request: Request, secret: string): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw unauthorized();
  return verifySessionToken(match[1], secret);
}

function unauthorized(): HttpError {
  return new HttpError(401, "unauthorized", "Missing or invalid session.");
}
