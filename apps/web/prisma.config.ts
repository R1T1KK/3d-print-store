/**
 * Prisma 7 configuration file.
 *
 * In Prisma v7+, the database connection URL is defined here instead of
 * inside prisma/schema.prisma. See: https://pris.ly/d/config-datasource
 *
 * The DATABASE_URL environment variable must be set before running:
 *   - npx prisma migrate dev
 *   - npx prisma generate
 *   - npx prisma validate
 *
 * For local dev: copy apps/web/.env.example to apps/web/.env.local and fill in your
 * Supabase connection string.
 */

import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
