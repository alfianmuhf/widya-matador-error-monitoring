import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 Error Service API running on port ${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`========================================`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 [${signal}] signal received: closing HTTP server...`);
  server.close(async () => {
    console.log("🔒 HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("🔌 Prisma database client disconnected.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during database disconnect:", err);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error("⚠️ Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection at:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception thrown:", error);
  process.exit(1);
});
