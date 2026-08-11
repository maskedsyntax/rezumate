import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { PurchaseService } from "../src/purchase-service.js";
import type { Logger, PubSubAuthGateway } from "../src/types.js";

function testApp() {
  const service = {
    verifyClient: vi.fn().mockResolvedValue({
      entitled: true,
      status: "PURCHASED_ACKNOWLEDGED",
      acknowledged: true,
      tokenHash: "abc123",
    }),
    verifyRtdn: vi.fn().mockResolvedValue({
      entitled: false,
      status: "CANCELLED",
      acknowledged: false,
      tokenHash: "abc123",
    }),
    validateRtdnPackage: vi.fn(),
  };
  const auth: PubSubAuthGateway = { verify: vi.fn().mockResolvedValue(undefined) };
  const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    app: createApp(service as unknown as PurchaseService, auth, logger),
    service,
    auth,
  };
}

describe("HTTP API", () => {
  it("reports health", async () => {
    const { app } = testApp();
    await request(app).get("/healthz").expect(200, { status: "ok" });
  });

  it("validates verification requests", async () => {
    const { app, service } = testApp();
    const response = await request(app)
      .post("/v1/google-play/purchases/verify")
      .send({ productId: "premium_lifetime" })
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_REQUEST");
    expect(service.verifyClient).not.toHaveBeenCalled();
  });

  it("requires Pub/Sub bearer authentication", async () => {
    const { app, auth } = testApp();
    await request(app).post("/v1/google-play/rtdn").send({}).expect(401);
    expect(auth.verify).not.toHaveBeenCalled();
  });

  it("authenticates and processes a one-time-product RTDN message", async () => {
    const { app, service, auth } = testApp();
    const notification = {
      packageName: "com.example.app",
      oneTimeProductNotification: {
        notificationType: 1,
        purchaseToken: "purchase-token-12345",
        sku: "premium_lifetime",
      },
    };

    await request(app)
      .post("/v1/google-play/rtdn")
      .set("authorization", "Bearer signed.jwt.value")
      .send({
        message: {
          data: Buffer.from(JSON.stringify(notification)).toString("base64"),
          messageId: "message-1",
        },
      })
      .expect(204);

    expect(auth.verify).toHaveBeenCalledWith("signed.jwt.value");
    expect(service.verifyRtdn).toHaveBeenCalledWith({
      packageName: "com.example.app",
      productId: "premium_lifetime",
      purchaseToken: "purchase-token-12345",
      messageId: "message-1",
    });
  });

  it("authenticates and accepts a Play Console test notification", async () => {
    const { app, service, auth } = testApp();
    const notification = {
      version: "1.0",
      packageName: "com.example.app",
      testNotification: { version: "1.0" },
    };

    await request(app)
      .post("/v1/google-play/rtdn")
      .set("authorization", "Bearer signed.jwt.value")
      .send({
        message: {
          data: Buffer.from(JSON.stringify(notification)).toString("base64"),
          messageId: "test-message-1",
        },
      })
      .expect(204);

    expect(auth.verify).toHaveBeenCalledWith("signed.jwt.value");
    expect(service.validateRtdnPackage).toHaveBeenCalledWith("com.example.app");
    expect(service.verifyRtdn).not.toHaveBeenCalled();
  });
});
