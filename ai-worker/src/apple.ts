import { base64UrlDecode, base64UrlEncode, HttpError } from "./http";

const encoder = new TextEncoder();

/** Signs an ES256 JWT with an Apple .p8 private key (PKCS#8 PEM). */
export async function signAppleJwt(
  privateKeyPem: string,
  keyId: string,
  claims: Record<string, unknown>,
  extraHeader: Record<string, unknown> = {},
): Promise<string> {
  const der = pemToDer(privateKeyPem);
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = { alg: "ES256", kid: keyId, typ: "JWT", ...extraHeader };
  const signingInput = `${base64UrlEncode(encoder.encode(JSON.stringify(header)))}.${base64UrlEncode(
    encoder.encode(JSON.stringify(claims)),
  )}`;
  // WebCrypto returns the raw r||s signature, which is the JWS ES256 format.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

/** Decodes a JWS payload without verifying it. Only use on data fetched from Apple over TLS. */
export function decodeJwsPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWS");
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as T;
}

// MARK: - App Store Server API

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  expiresDate?: number;
  revocationDate?: number;
  environment?: string;
}

interface AppStoreCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
}

const STOREKIT_HOSTS = ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"];

/**
 * Looks up a transaction with Apple. Tries production first, then sandbox, because
 * TestFlight and App Review purchases live in the sandbox environment.
 */
export async function fetchTransaction(
  transactionId: string,
  credentials: AppStoreCredentials,
): Promise<AppleTransaction | null> {
  if (!/^\d{1,32}$/.test(transactionId)) {
    throw new HttpError(400, "invalid_input", "Invalid transaction id.");
  }
  const now = Math.floor(Date.now() / 1000);
  const token = await signAppleJwt(credentials.privateKey, credentials.keyId, {
    iss: credentials.issuerId,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1",
    bid: credentials.bundleId,
  });

  for (const host of STOREKIT_HOSTS) {
    const response = await fetch(`${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new HttpError(502, "apple_unavailable", `App Store lookup failed (${response.status}).`);
    }
    const body = (await response.json()) as { signedTransactionInfo?: string };
    if (!body.signedTransactionInfo) return null;
    return decodeJwsPayload<AppleTransaction>(body.signedTransactionInfo);
  }
  return null;
}

// MARK: - DeviceCheck

interface DeviceCheckCredentials {
  teamId: string;
  keyId: string;
  privateKey: string;
  development: boolean;
}

/**
 * Validates that the token came from a real Apple device running this app, and reports
 * whether this device has already used its free trial (stored in Apple's per-device bit0,
 * which survives reinstalls).
 */
export async function checkDeviceAndClaimTrial(deviceToken: string, credentials: DeviceCheckCredentials): Promise<{ trialAlreadyUsed: boolean }> {
  const host = credentials.development
    ? "https://api.development.devicecheck.apple.com"
    : "https://api.devicecheck.apple.com";
  const jwt = await signAppleJwt(credentials.privateKey, credentials.keyId, {
    iss: credentials.teamId,
    iat: Math.floor(Date.now() / 1000),
  });
  const call = (path: string, extra: Record<string, unknown> = {}) =>
    fetch(`${host}/v1/${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({
        device_token: deviceToken,
        transaction_id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...extra,
      }),
    });

  const query = await call("query_two_bits");
  if (query.status === 400) {
    throw new HttpError(401, "device_check_failed", "This device could not be verified.");
  }
  // 401 means Apple rejected our key, not the device.
  if (query.status === 401) {
    console.error(JSON.stringify({ event: "devicecheck_auth_rejected", body: (await query.text()).slice(0, 200) }));
    throw new HttpError(502, "apple_unavailable", "DeviceCheck is not configured correctly.");
  }
  if (!query.ok) {
    throw new HttpError(502, "apple_unavailable", `DeviceCheck failed (${query.status}).`);
  }
  // Apple answers "Failed to find bit state" in plain text for a device it has never seen.
  const text = await query.text();
  let trialAlreadyUsed = false;
  try {
    trialAlreadyUsed = (JSON.parse(text) as { bit0?: boolean }).bit0 === true;
  } catch {
    trialAlreadyUsed = false;
  }

  if (!trialAlreadyUsed) {
    const update = await call("update_two_bits", { bit0: true, bit1: false });
    if (!update.ok) {
      throw new HttpError(502, "apple_unavailable", `DeviceCheck update failed (${update.status}).`);
    }
  }
  return { trialAlreadyUsed };
}
