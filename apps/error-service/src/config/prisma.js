import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";

const prismaClientSingleton = () => {
  const connectionString = env.DIRECT_URL || env.DATABASE_URL;
  const adapter = new PrismaPg({
    connectionString,
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

globalForPrisma.prisma = prisma;

export default prisma;
