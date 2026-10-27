export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: HttpError): Response {
  return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
}

const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    throw new HttpError(413, "body_too_large", "Request body is too large.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new HttpError(413, "body_too_large", "Request body is too large.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "invalid_json", "Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function requireString(value: unknown, field: string, maxLength: number, { optional = false } = {}): string {
  if (value === undefined || value === null || value === "") {
    if (optional) return "";
    throw new HttpError(400, "invalid_input", `${field} is required.`);
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "invalid_input", `${field} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, "invalid_input", `${field} is longer than ${maxLength} characters.`);
  }
  return value;
}

export function requireStringArray(value: unknown, field: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, "invalid_input", `${field} must be an array.`);
  }
  if (value.length > maxItems) {
    throw new HttpError(400, "invalid_input", `${field} has more than ${maxItems} items.`);
  }
  return value.map((item, index) => requireString(item, `${field}[${index}]`, maxLength));
}

export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function intVar(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
