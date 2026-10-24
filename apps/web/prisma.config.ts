/**
 * Prisma 7 configuration file.
 *
 * In Prisma v7+, the database connection URL is defined here instead of
 * inside prisma/schema.prisma. See: https://pris.ly/d/config-datasource
 *
 * Load order for CLI commands (prisma db push / migrate):
 *   1. This file loads .env.local (if present) via Node.js process.loadEnvFile
 *   2. DATABASE_URL  — used at runtime via PgBouncer pooler (port 6543)
 *   3. DIRECT_URL    — used by Prisma CLI for schema migrations (port 5432, bypasses PgBouncer)
 */

import { defineConfig } from "prisma/config";

// Load .env.local for local dev (Node.js v20.12+)
// Next.js handles this automatically for the app runtime; the CLI needs it explicitly.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI/production — silently skip
}

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
