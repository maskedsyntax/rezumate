import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import helmet from "helmet";
import { z, ZodError } from "zod";
import { HttpError } from "./errors.js";
import type { PurchaseService } from "./purchase-service.js";
import type { Logger, PubSubAuthGateway } from "./types.js";

const verifySchema = z
  .object({
    packageName: z.string().min(3).max(255),
    productId: z.string().min(1).max(255),
    purchaseToken: z.string().min(10).max(4_096),
    integrityToken: z.string().min(10).max(32_768),
  })
  .strict();

const pubsubEnvelopeSchema = z.object({
  message: z.object({
    data: z
      .string()
      .min(1)
      .max(65_536)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    messageId: z.string().min(1).max(255),
  }),
});

const oneTimeDeveloperNotificationSchema = z.object({
  packageName: z.string().min(3).max(255),
  oneTimeProductNotification: z.object({
    notificationType: z.union([z.literal(1), z.literal(2)]),
    purchaseToken: z.string().min(10).max(4_096),
    sku: z.string().min(1).max(255),
  }),
});

const testDeveloperNotificationSchema = z.object({
  packageName: z.string().min(3).max(255),
  testNotification: z.object({
    version: z.string().min(1).max(20),
  }),
});

const developerNotificationSchema = z.union([
  oneTimeDeveloperNotificationSchema,
  testDeveloperNotificationSchema,
]);

function bearerToken(header: string | undefined): string {
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header ?? "");
  if (!match?.[1]) throw new HttpError(401, "UNAUTHORIZED", "Valid bearer token required");
  return match[1];
}

function requestLogging(logger: Logger): RequestHandler {
  return (request, response, next) => {
    const requestId = request.get("x-request-id")?.slice(0, 128) || randomUUID();
    response.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    response.on("finish", () => {
      logger.info(
        {
          requestId,
          method: request.method,
          path: request.path,
          status: response.statusCode,
          latencyMs: Date.now() - startedAt,
        },
        "HTTP request completed",
      );
    });
    next();
  };
}

export function createApp(
  purchaseService: PurchaseService,
  pubsubAuth: PubSubAuthGateway,
  logger: Logger,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLogging(logger));
  app.use(helmet());
  app.use(express.json({ limit: "96kb", type: "application/json" }));

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/v1/google-play/purchases/verify", async (request, response) => {
    const input = verifySchema.parse(request.body);
    const result = await purchaseService.verifyClient(input);
    response.status(200).json(result);
  });

  app.post("/v1/google-play/rtdn", async (request, response) => {
    await pubsubAuth.verify(bearerToken(request.get("authorization")));
    const envelope = pubsubEnvelopeSchema.parse(request.body);
    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(envelope.message.data, "base64").toString("utf8"));
    } catch {
      throw new HttpError(400, "INVALID_NOTIFICATION", "Invalid Pub/Sub message data");
    }
    const notification = developerNotificationSchema.parse(decoded);
    if ("testNotification" in notification) {
      purchaseService.validateRtdnPackage(notification.packageName);
      logger.info(
        { messageId: envelope.message.messageId, packageName: notification.packageName },
        "Google Play RTDN test notification received",
      );
      response.status(204).send();
      return;
    }
    await purchaseService.verifyRtdn({
      packageName: notification.packageName,
      productId: notification.oneTimeProductNotification.sku,
      purchaseToken: notification.oneTimeProductNotification.purchaseToken,
      messageId: envelope.message.messageId,
    });
    response.status(204).send();
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
    if (response.headersSent) return;
    const requestId = response.getHeader("x-request-id");
    if (error instanceof ZodError || (error instanceof SyntaxError && "body" in error)) {
      logger.warn({ requestId, path: request.path }, "Request validation failed");
      response.status(400).json({
        error: { code: "INVALID_REQUEST", message: "Request body is invalid" },
      });
      return;
    }
    if (error instanceof HttpError) {
      logger.warn(
        { requestId, path: request.path, code: error.code, retryable: error.retryable },
        error.message,
      );
      response.status(error.status).json({
        error: { code: error.code, message: error.message, retryable: error.retryable },
      });
      return;
    }
    logger.error(
      {
        requestId,
        path: request.path,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
      "Unhandled request error",
    );
    response.status(503).json({
      error: { code: "SERVICE_UNAVAILABLE", message: "Request could not be completed", retryable: true },
    });
  };
  app.use(errorHandler);

  return app;
}
