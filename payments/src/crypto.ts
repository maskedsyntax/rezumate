import { createHash, timingSafeEqual } from "node:crypto";

export function tokenHash(purchaseToken: string): string {
  return createHash("sha256").update(purchaseToken, "utf8").digest("hex");
}

export function purchaseRequestHash(
  packageName: string,
  productId: string,
  purchaseToken: string,
): string {
  return createHash("sha256")
    .update(`${packageName}\n${productId}\n${purchaseToken}`, "utf8")
    .digest("base64url");
}

export function safelyEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
