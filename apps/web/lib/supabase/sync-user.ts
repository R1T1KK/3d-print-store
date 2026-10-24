import { prisma } from "@/lib/prisma";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

/**
 * Idempotently creates or synchronizes an application user in PostgreSQL
 * via Prisma, using the Supabase Auth user ID as the stable identity reference.
 *
 * Concurrency & duplicate safe: handles repeated callbacks, OAuth returns,
 * and existing records gracefully.
 */
export async function syncUserProfile(supabaseUser: SupabaseAuthUser) {
  if (!supabaseUser || !supabaseUser.id || !supabaseUser.email) {
    return null;
  }

  try {
    const email = supabaseUser.email.toLowerCase().trim();
    const displayName =
      (supabaseUser.user_metadata?.name as string | undefined) ||
      (supabaseUser.user_metadata?.full_name as string | undefined) ||
      null;

    // 1. Check if user already exists with this exact Supabase UUID
    const existingById = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
    });

    if (existingById) {
      // Update name/email if changed
      return await prisma.user.update({
        where: { id: supabaseUser.id },
        data: {
          email,
          name: displayName ?? existingById.name,
        },
      });
    }

    // 2. Check if a legacy or seeded record exists with the same email
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      // Keep existing record and return
      return existingByEmail;
    }

    // 3. Create a new user record
    return await prisma.user.create({
      data: {
        id: supabaseUser.id,
        email,
        name: displayName,
        role: "CUSTOMER",
      },
    });
  } catch (err: unknown) {
    console.error("Warning: Error syncing user profile with Prisma:", err);
    // Return null so the authentication session does not fail completely if DB is syncing
    return null;
  }
}
