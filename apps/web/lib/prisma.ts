/**
 * Prisma client singleton with lazy instantiation.
 *
 * In Next.js App Router, lazy instantiation prevents build-time evaluation
 * failures when database credentials (DATABASE_URL) are not yet configured.
 */
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    try {
      const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "warn", "error"]
            : ["warn", "error"],
      });
    } catch (e) {
      console.warn("PrismaClient initialization deferred:", e);
      return {} as PrismaClient;
    }
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

if (process.env.NODE_ENV !== "production") {
  // globalForPrisma.prisma cached on demand
}
