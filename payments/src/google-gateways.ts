import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { HttpError } from "./errors.js";
import type {
  IntegrityGateway,
  IntegrityPayload,
  ProductPurchase,
  PublisherGateway,
  PubSubAuthGateway,
} from "./types.js";

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; response?: { status?: unknown } };
  if (typeof candidate.code === "number") return candidate.code;
  return typeof candidate.response?.status === "number" ? candidate.response.status : undefined;
}

export class GoogleIntegrityGateway implements IntegrityGateway {
  private readonly client = google.playintegrity({
    version: "v1",
    auth: new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/playintegrity"],
    }),
  });

  async decode(packageName: string, integrityToken: string): Promise<IntegrityPayload> {
    try {
      const response = await this.client.v1.decodeIntegrityToken({
        packageName,
        requestBody: { integrityToken },
      });
      return response.data.tokenPayloadExternal ?? {};
    } catch (error) {
      if (responseStatus(error) === 400) {
        throw new HttpError(403, "INTEGRITY_REJECTED", "Play Integrity token was rejected");
      }
      throw error;
    }
  }
}

export class GooglePublisherGateway implements PublisherGateway {
  private readonly client = google.androidpublisher({
    version: "v3",
    auth: new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    }),
  });

  async getProduct(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<ProductPurchase | null> {
    try {
      const response = await this.client.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken,
      });
      return response.data;
    } catch (error) {
      if ([400, 404, 410].includes(responseStatus(error) ?? 0)) return null;
      throw error;
    }
  }

  async acknowledge(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<void> {
    await this.client.purchases.products.acknowledge({
      packageName,
      productId,
      token: purchaseToken,
      requestBody: {},
    });
  }
}

export class GooglePubSubAuthGateway implements PubSubAuthGateway {
  private readonly client = new OAuth2Client();

  constructor(
    private readonly audience: string,
    private readonly serviceAccountEmail: string,
  ) {}

  async verify(idToken: string): Promise<void> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience,
      });
      const payload = ticket.getPayload();
      if (
        payload?.email !== this.serviceAccountEmail ||
        payload.email_verified !== true ||
        payload.iss !== "https://accounts.google.com"
      ) {
        throw new Error("Unexpected Pub/Sub identity");
      }
    } catch {
      throw new HttpError(401, "UNAUTHORIZED", "Pub/Sub identity is not authorized");
    }
  }
}
