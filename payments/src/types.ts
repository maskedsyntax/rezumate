export type PurchaseStatus =
  | "PURCHASED_ACKNOWLEDGED"
  | "PENDING"
  | "CANCELLED"
  | "CONSUMED"
  | "INVALID";

export interface ProductPurchase {
  purchaseState?: number | null;
  acknowledgementState?: number | null;
  consumptionState?: number | null;
  purchaseTimeMillis?: string | null;
}

export interface IntegrityPayload {
  requestDetails?: {
    requestPackageName?: string | null;
    requestHash?: string | null;
    timestampMillis?: string | null;
  } | null;
  appIntegrity?: {
    appRecognitionVerdict?: string | null;
    packageName?: string | null;
    certificateSha256Digest?: string[] | null;
  } | null;
  deviceIntegrity?: {
    deviceRecognitionVerdict?: string[] | null;
  } | null;
  accountDetails?: {
    appLicensingVerdict?: string | null;
  } | null;
}

export interface IntegrityGateway {
  decode(packageName: string, integrityToken: string): Promise<IntegrityPayload>;
}

export interface PublisherGateway {
  getProduct(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<ProductPurchase | null>;
  acknowledge(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<void>;
}

export interface AuditEntry {
  tokenHash: string;
  packageName: string;
  productId: string;
  status: PurchaseStatus;
  entitled: boolean;
  acknowledged: boolean;
  source: "client" | "rtdn";
  integrityVerified: boolean;
  purchaseTimeMillis?: string;
  rtdnMessageId?: string;
}

export interface AuditStore {
  record(entry: AuditEntry): Promise<void>;
}

export interface PubSubAuthGateway {
  verify(idToken: string): Promise<void>;
}

export interface Logger {
  info(fields: Record<string, unknown>, message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
  error(fields: Record<string, unknown>, message: string): void;
}
