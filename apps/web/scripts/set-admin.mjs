import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const targetEmail = process.argv[2] || "ritikxyzxyz@gmail.com";
const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log(`Setting role ADMIN for: ${targetEmail}...`);

    // 1. Update in PostgreSQL via Prisma/PG
    const res = await pool.query(
      'UPDATE "User" SET role = \'ADMIN\' WHERE LOWER(email) = LOWER($1) RETURNING id, email, role',
      [targetEmail]
    );

    if (res.rows.length === 0) {
      console.warn(`User ${targetEmail} not found in database.`);
    } else {
      console.log("Updated PostgreSQL user:", res.rows[0]);
    }

    // 2. Update in Supabase Auth app_metadata if service role key available
    if (supabaseUrl && serviceRoleKey && !serviceRoleKey.includes("[YOUR-")) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.warn("Could not list Supabase auth users:", listError.message);
      } else {
        const authUser = users.users.find(
          (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
        );
        if (authUser) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            {
              app_metadata: { ...authUser.app_metadata, role: "ADMIN" },
              user_metadata: { ...authUser.user_metadata, role: "ADMIN" },
            }
          );
          if (updateError) {
            console.warn("Could not update Supabase app_metadata:", updateError.message);
          } else {
            console.log(`Updated Supabase Auth metadata for ${authUser.id} to role: ADMIN`);
          }
        }
      }
    }

    console.log("Admin promotion completed successfully!");
  } catch (err) {
    console.error("Error setting admin role:", err);
  } finally {
    await pool.end();
  }
}

main();
