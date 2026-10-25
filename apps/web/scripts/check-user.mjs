import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const targetEmail = process.argv[2] || "ritikxyzxyz@gmail.com";
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const pool = new Pool({ connectionString });

async function main() {
  console.log(`Checking user info for: ${targetEmail}`);

  // 1. PostgreSQL DB
  const pgRes = await pool.query('SELECT id, email, role, name FROM "User" WHERE LOWER(email) = LOWER($1)', [targetEmail]);
  console.log("PostgreSQL User:", pgRes.rows);

  // 2. Supabase Auth
  if (supabaseUrl && serviceRoleKey) {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error("Supabase listUsers error:", error);
    } else {
      const u = users.users.find(x => x.email?.toLowerCase() === targetEmail.toLowerCase());
      if (u) {
        console.log("Supabase Auth User:", {
          id: u.id,
          email: u.email,
          app_metadata: u.app_metadata,
          user_metadata: u.user_metadata,
        });
      } else {
        console.log("User not found in Supabase Auth users list.");
      }
    }
  }

  await pool.end();
}

main().catch(console.error);
