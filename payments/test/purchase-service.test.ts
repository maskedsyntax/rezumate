import { beforeEach, describe, expect, it, vi } from "vitest";
import { purchaseRequestHash } from "../src/crypto.js";
import { PurchaseService } from "../src/purchase-service.js";
import type {
  AuditStore,
  IntegrityGateway,
  Logger,
  ProductPurchase,
  PublisherGateway,
} from "../src/types.js";

const packageName = "com.example.app";
const productId = "premium_lifetime";
const purchaseToken = "purchase-token-12345";
const now = 1_750_000_000_000;

function validIntegrity() {
  return {
    requestDetails: {
      requestPackageName: packageName,
      requestHash: purchaseRequestHash(packageName, productId, purchaseToken),
      timestampMillis: String(now - 1_000),
    },
    appIntegrity: {
      appRecognitionVerdict: "PLAY_RECOGNIZED",
      packageName,
      certificateSha256Digest: ["release-cert"],
    },
    deviceIntegrity: { deviceRecognitionVerdict: ["MEETS_DEVICE_INTEGRITY"] },
    accountDetails: { appLicensingVerdict: "LICENSED" },
  };
}

describe("PurchaseService", () => {
  let integrity: IntegrityGateway;
  let publisher: PublisherGateway;
  let audit: AuditStore;
  let service: PurchaseService;
  let getProduct: ReturnType<typeof vi.fn<(typeof publisher)["getProduct"]>>;
  let acknowledge: ReturnType<typeof vi.fn<(typeof publisher)["acknowledge"]>>;
  let record: ReturnType<typeof vi.fn<(typeof audit)["record"]>>;

  beforeEach(() => {
    integrity = { decode: vi.fn().mockResolvedValue(validIntegrity()) };
    getProduct = vi.fn();
    acknowledge = vi.fn().mockResolvedValue(undefined);
    publisher = { getProduct, acknowledge };
    record = vi.fn().mockResolvedValue(undefined);
    audit = { record };
    const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    service = new PurchaseService(
      {
        packageName,
        nonConsumableProductIds: new Set([productId]),
        playCertificateDigests: new Set(["release-cert"]),
        integrityMaxAgeMs: 120_000,
      },
      integrity,
      publisher,
      audit,
      logger,
      () => now,
    );
  });

  it("acknowledges and entitles an unacknowledged purchased non-consumable", async () => {
    getProduct.mockResolvedValue({
      purchaseState: 0,
      acknowledgementState: 0,
      consumptionState: 0,
    });

    const result = await service.verifyClient({
      packageName,
      productId,
      purchaseToken,
      integrityToken: "integrity-token-12345",
    });

    expect(result).toMatchObject({
      entitled: true,
      status: "PURCHASED_ACKNOWLEDGED",
      acknowledged: true,
    });
    expect(acknowledge).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PURCHASED_ACKNOWLEDGED",
        entitled: true,
        integrityVerified: true,
      }),
    );
  });

  it.each([
    [{ purchaseState: 2, acknowledgementState: 0 }, "PENDING"],
    [{ purchaseState: 1, acknowledgementState: 0 }, "CANCELLED"],
    [{ purchaseState: 0, acknowledgementState: 1, consumptionState: 1 }, "CONSUMED"],
  ] satisfies Array<[ProductPurchase, string]>) (
    "does not entitle state %#",
    async (purchase, status) => {
      getProduct.mockResolvedValue(purchase);

      const result = await service.verifyClient({
        packageName,
        productId,
        purchaseToken,
        integrityToken: "integrity-token-12345",
      });

      expect(result).toMatchObject({ entitled: false, status });
      expect(acknowledge).not.toHaveBeenCalled();
      expect(record).toHaveBeenCalledWith(
        expect.objectContaining({ entitled: false, status }),
      );
    },
  );

  it("rejects a stale integrity verdict before querying Publisher", async () => {
    vi.mocked(integrity.decode).mockResolvedValue({
      ...validIntegrity(),
      requestDetails: {
        ...validIntegrity().requestDetails,
        timestampMillis: String(now - 121_000),
      },
    });

    await expect(
      service.verifyClient({
        packageName,
        productId,
        purchaseToken,
        integrityToken: "integrity-token-12345",
      }),
    ).rejects.toMatchObject({ status: 403, code: "INTEGRITY_REJECTED" });
    expect(getProduct).not.toHaveBeenCalled();
  });

  it("recovers when another request acknowledged the token concurrently", async () => {
    getProduct
      .mockResolvedValueOnce({ purchaseState: 0, acknowledgementState: 0, consumptionState: 0 })
      .mockResolvedValueOnce({ purchaseState: 0, acknowledgementState: 1, consumptionState: 0 });
    acknowledge.mockRejectedValueOnce(new Error("already acknowledged"));

    const result = await service.verifyClient({
      packageName,
      productId,
      purchaseToken,
      integrityToken: "integrity-token-12345",
    });

    expect(result.entitled).toBe(true);
    expect(getProduct).toHaveBeenCalledTimes(2);
  });

  it("re-verifies an RTDN token without an integrity verdict", async () => {
    getProduct.mockResolvedValue({ purchaseState: 1, acknowledgementState: 0 });

    const result = await service.verifyRtdn({
      packageName,
      productId,
      purchaseToken,
      messageId: "message-1",
    });

    expect(result).toMatchObject({ entitled: false, status: "CANCELLED" });
    expect(integrity.decode).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ source: "rtdn", integrityVerified: false }),
    );
  });

  it("does not return entitlement when the audit write fails", async () => {
    getProduct.mockResolvedValue({ purchaseState: 0, acknowledgementState: 1, consumptionState: 0 });
    record.mockRejectedValue(new Error("Firestore unavailable"));

    await expect(
      service.verifyClient({
        packageName,
        productId,
        purchaseToken,
        integrityToken: "integrity-token-12345",
      }),
    ).rejects.toThrow("Firestore unavailable");
  });
});
