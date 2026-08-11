import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { FirestoreAuditStore } from "./firestore-audit.js";
import {
  GoogleIntegrityGateway,
  GooglePublisherGateway,
  GooglePubSubAuthGateway,
} from "./google-gateways.js";
import { logger } from "./logger.js";
import { PurchaseService } from "./purchase-service.js";

const config = loadConfig();
const purchaseService = new PurchaseService(
  config,
  new GoogleIntegrityGateway(),
  new GooglePublisherGateway(),
  new FirestoreAuditStore(config.firestoreCollection),
  logger,
);
const app = createApp(
  purchaseService,
  new GooglePubSubAuthGateway(config.pubsubAudience, config.pubsubServiceAccountEmail),
  logger,
);
const server = app.listen(config.port, "0.0.0.0", () => {
  logger.info({ port: config.port }, "Payments service listening");
});

function shutdown(signal: string): void {
  logger.info({ signal }, "Shutting down payments service");
  server.close((error) => {
    if (error) {
      logger.error({ errorType: error.name }, "Payments service shutdown failed");
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
