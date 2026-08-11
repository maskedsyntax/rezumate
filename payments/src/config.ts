import { z } from "zod";

const csv = z.string().transform((value, context) => {
  const values = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  if (values.length === 0) {
    context.addIssue({ code: "custom", message: "must contain at least one value" });
    return z.NEVER;
  }
  return values;
});

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  GOOGLE_PLAY_PACKAGE_NAME: z.string().min(3).max(255),
  NON_CONSUMABLE_PRODUCT_IDS: csv,
  PLAY_CERTIFICATE_SHA256_DIGESTS: csv,
  INTEGRITY_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(600).default(120),
  FIRESTORE_COLLECTION: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,100}$/)
    .default("google_play_purchases"),
  PUBSUB_AUDIENCE: z.url(),
  PUBSUB_SERVICE_ACCOUNT_EMAIL: z.email(),
});

export type Config = {
  port: number;
  packageName: string;
  nonConsumableProductIds: ReadonlySet<string>;
  playCertificateDigests: ReadonlySet<string>;
  integrityMaxAgeMs: number;
  firestoreCollection: string;
  pubsubAudience: string;
  pubsubServiceAccountEmail: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const value = schema.parse(env);
  return {
    port: value.PORT,
    packageName: value.GOOGLE_PLAY_PACKAGE_NAME,
    nonConsumableProductIds: new Set(value.NON_CONSUMABLE_PRODUCT_IDS),
    playCertificateDigests: new Set(value.PLAY_CERTIFICATE_SHA256_DIGESTS),
    integrityMaxAgeMs: value.INTEGRITY_MAX_AGE_SECONDS * 1_000,
    firestoreCollection: value.FIRESTORE_COLLECTION,
    pubsubAudience: value.PUBSUB_AUDIENCE,
    pubsubServiceAccountEmail: value.PUBSUB_SERVICE_ACCOUNT_EMAIL,
  };
}
