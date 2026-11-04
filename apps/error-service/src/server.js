import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./config/logger.js";
import { createVideoWorker } from "./modules/attachment/attachment.queue.js";

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(
    { port: PORT, env: env.NODE_ENV, url: `http://localhost:${PORT}` },
    `🚀 Error Service API running on port ${PORT} [${env.NODE_ENV}]`
  );
});

// Inisialisasi BullMQ Worker untuk antrean pemrosesan video
let videoWorker = null;
try {
  videoWorker = createVideoWorker();
  logger.info("🎬 BullMQ Video Transcode Worker initialized.");
} catch (workerErr) {
  logger.warn({ err: workerErr }, `⚠️ Failed to initialize BullMQ Video Worker: ${workerErr.message}`);
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 [${signal}] signal received: closing HTTP server...`);

  if (videoWorker) {
    try {
      await videoWorker.close();
      logger.info("🎬 BullMQ Video Worker closed.");
    } catch (err) {
      logger.warn({ err }, `⚠️ Error closing BullMQ worker: ${err.message}`);
    }
  }

  server.close(async () => {
    logger.info("🔒 HTTP server closed.");
    try {
      await prisma.$disconnect();
      logger.info("🔌 Prisma database client disconnected.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "❌ Error during database disconnect");
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("⚠️ Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "💥 Unhandled Rejection at promise");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "💥 Uncaught Exception thrown");
  process.exit(1);
});
