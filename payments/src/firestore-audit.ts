import { FieldValue, Firestore } from "@google-cloud/firestore";
import type { AuditEntry, AuditStore } from "./types.js";

export class FirestoreAuditStore implements AuditStore {
  private readonly firestore = new Firestore();

  constructor(private readonly collectionName: string) {}

  async record(entry: AuditEntry): Promise<void> {
    const reference = this.firestore.collection(this.collectionName).doc(entry.tokenHash);

    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const previous = snapshot.data();
      if (
        previous &&
        (previous.packageName !== entry.packageName || previous.productId !== entry.productId)
      ) {
        throw new Error("Purchase token is already bound to different purchase metadata");
      }

      const data: Record<string, unknown> = {
        packageName: entry.packageName,
        productId: entry.productId,
        status: entry.status,
        entitled: entry.entitled,
        acknowledged: entry.acknowledged,
        lastSource: entry.source,
        attempts: Number(previous?.attempts ?? 0) + 1,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!snapshot.exists) data.createdAt = FieldValue.serverTimestamp();
      if (entry.integrityVerified) data.integrityVerifiedAt = FieldValue.serverTimestamp();
      if (entry.purchaseTimeMillis) data.purchaseTimeMillis = entry.purchaseTimeMillis;
      if (entry.rtdnMessageId) data.lastRtdnMessageId = entry.rtdnMessageId;

      transaction.set(reference, data, { merge: true });
    });
  }
}
