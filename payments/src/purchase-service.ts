import { purchaseRequestHash, safelyEqual, tokenHash } from "./crypto.js";
import { HttpError } from "./errors.js";
import type {
  AuditEntry,
  AuditStore,
  IntegrityGateway,
  IntegrityPayload,
  Logger,
  ProductPurchase,
  PublisherGateway,
  PurchaseStatus,
} from "./types.js";

export interface PurchaseServiceConfig {
  packageName: string;
  nonConsumableProductIds: ReadonlySet<string>;
  playCertificateDigests: ReadonlySet<string>;
  integrityMaxAgeMs: number;
}

export interface ClientVerificationInput {
  packageName: string;
  productId: string;
  purchaseToken: string;
  integrityToken: string;
}

export interface RtdnVerificationInput {
  packageName: string;
  productId: string;
  purchaseToken: string;
  messageId: string;
}

export interface VerificationResult {
  entitled: boolean;
  status: PurchaseStatus;
  acknowledged: boolean;
  tokenHash: string;
}

interface ProcessingContext {
  packageName: string;
  productId: string;
  purchaseToken: string;
  source: "client" | "rtdn";
  integrityVerified: boolean;
  rtdnMessageId?: string;
}

export class PurchaseService {
  constructor(
    private readonly config: PurchaseServiceConfig,
    private readonly integrity: IntegrityGateway,
    private readonly publisher: PublisherGateway,
    private readonly audit: AuditStore,
    private readonly logger: Logger,
    private readonly now: () => number = Date.now,
  ) {}

  validateRtdnPackage(packageName: string): void {
    if (packageName !== this.config.packageName) {
      throw new HttpError(400, "INVALID_PACKAGE", "Unexpected package name");
    }
  }

  async verifyClient(input: ClientVerificationInput): Promise<VerificationResult> {
    this.validateCatalog(input.packageName, input.productId);
    const payload = await this.integrity.decode(input.packageName, input.integrityToken);
    this.verifyIntegrity(payload, input);
    return this.processPurchase({
      packageName: input.packageName,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
      source: "client",
      integrityVerified: true,
    });
  }

  async verifyRtdn(input: RtdnVerificationInput): Promise<VerificationResult> {
    this.validateCatalog(input.packageName, input.productId);
    return this.processPurchase({
      packageName: input.packageName,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
      source: "rtdn",
      integrityVerified: false,
      rtdnMessageId: input.messageId,
    });
  }

  private validateCatalog(packageName: string, productId: string): void {
    if (packageName !== this.config.packageName) {
      throw new HttpError(400, "INVALID_PACKAGE", "Package name is not configured");
    }
    if (!this.config.nonConsumableProductIds.has(productId)) {
      throw new HttpError(400, "INVALID_PRODUCT", "Product is not a configured non-consumable");
    }
  }

  private verifyIntegrity(
    payload: IntegrityPayload,
    input: ClientVerificationInput,
  ): void {
    const request = payload.requestDetails;
    const app = payload.appIntegrity;
    const devices = payload.deviceIntegrity?.deviceRecognitionVerdict ?? [];
    const certificateMatches = (app?.certificateSha256Digest ?? []).some((digest) =>
      this.config.playCertificateDigests.has(digest),
    );
    const expectedHash = purchaseRequestHash(
      input.packageName,
      input.productId,
      input.purchaseToken,
    );
    const timestamp = Number(request?.timestampMillis);
    const age = this.now() - timestamp;

    const accepted =
      request?.requestPackageName === input.packageName &&
      typeof request.requestHash === "string" &&
      safelyEqual(request.requestHash, expectedHash) &&
      Number.isFinite(timestamp) &&
      age >= -10_000 &&
      age <= this.config.integrityMaxAgeMs &&
      app?.appRecognitionVerdict === "PLAY_RECOGNIZED" &&
      app.packageName === input.packageName &&
      certificateMatches &&
      devices.includes("MEETS_DEVICE_INTEGRITY") &&
      payload.accountDetails?.appLicensingVerdict === "LICENSED";

    if (!accepted) {
      throw new HttpError(403, "INTEGRITY_REJECTED", "Play Integrity verdict was rejected");
    }
  }

  private async processPurchase(context: ProcessingContext): Promise<VerificationResult> {
    let purchase = await this.publisher.getProduct(
      context.packageName,
      context.productId,
      context.purchaseToken,
    );

    if (purchase?.purchaseState === 0 && purchase.consumptionState === 0) {
      if (purchase.acknowledgementState === 0) {
        try {
          await this.publisher.acknowledge(
            context.packageName,
            context.productId,
            context.purchaseToken,
          );
          purchase = { ...purchase, acknowledgementState: 1 };
        } catch (acknowledgeError) {
          const refreshed = await this.publisher.getProduct(
            context.packageName,
            context.productId,
            context.purchaseToken,
          );
          if (refreshed?.acknowledgementState !== 1 && refreshed?.purchaseState === 0) {
            throw acknowledgeError;
          }
          purchase = refreshed;
        }
      }
    }

    const result = this.resultFor(purchase, context.purchaseToken);
    const auditEntry: AuditEntry = {
      tokenHash: result.tokenHash,
      packageName: context.packageName,
      productId: context.productId,
      status: result.status,
      entitled: result.entitled,
      acknowledged: result.acknowledged,
      source: context.source,
      integrityVerified: context.integrityVerified,
      ...(purchase?.purchaseTimeMillis
        ? { purchaseTimeMillis: purchase.purchaseTimeMillis }
        : {}),
      ...(context.rtdnMessageId ? { rtdnMessageId: context.rtdnMessageId } : {}),
    };
    await this.audit.record(auditEntry);
    this.logger.info(
      {
        tokenHash: result.tokenHash,
        productId: context.productId,
        source: context.source,
        status: result.status,
        entitled: result.entitled,
      },
      "Google Play purchase processed",
    );
    return result;
  }

  private resultFor(
    purchase: ProductPurchase | null,
    purchaseToken: string,
  ): VerificationResult {
    const hash = tokenHash(purchaseToken);
    if (!purchase) {
      return { entitled: false, status: "INVALID", acknowledged: false, tokenHash: hash };
    }
    if (purchase.purchaseState === 1) {
      return { entitled: false, status: "CANCELLED", acknowledged: false, tokenHash: hash };
    }
    if (purchase.purchaseState === 2) {
      return { entitled: false, status: "PENDING", acknowledged: false, tokenHash: hash };
    }
    if (purchase.purchaseState !== 0 || ![0, 1].includes(purchase.acknowledgementState ?? -1)) {
      return { entitled: false, status: "INVALID", acknowledged: false, tokenHash: hash };
    }
    if (purchase.consumptionState === 1) {
      return { entitled: false, status: "CONSUMED", acknowledged: false, tokenHash: hash };
    }
    if (purchase.consumptionState !== 0) {
      return { entitled: false, status: "INVALID", acknowledged: false, tokenHash: hash };
    }
    const acknowledged = purchase.acknowledgementState === 1;
    return {
      entitled: acknowledged,
      status: acknowledged ? "PURCHASED_ACKNOWLEDGED" : "INVALID",
      acknowledged,
      tokenHash: hash,
    };
  }
}
