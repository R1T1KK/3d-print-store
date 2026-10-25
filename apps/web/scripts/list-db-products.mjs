import { Pool } from "pg";

process.loadEnvFile(".env.local");

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });

async function main() {
  const res = await pool.query('SELECT id, slug, name, "basePrice", stock, materials, active FROM "Product"');
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

main().catch(console.error);
