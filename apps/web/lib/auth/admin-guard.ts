import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User as DbUser } from "@prisma/client";

export interface AdminSessionResult {
  authorized: boolean;
  user: SupabaseAuthUser | null;
  dbUser: DbUser | null;
  reason?: "UNAUTHENTICATED" | "FORBIDDEN";
}

/**
 * Validates whether the current request is authenticated as an administrator.
 * Checks both Supabase Auth metadata and PostgreSQL User.role for maximum reliability.
 */
export async function getAdminSession(): Promise<AdminSessionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { authorized: false, user: null, dbUser: null, reason: "UNAUTHENTICATED" };
    }

    // 1. Check PostgreSQL database role (authoritative source of truth)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (dbUser && dbUser.role === "ADMIN") {
      return { authorized: true, user, dbUser };
    }

    // 2. Check Supabase Auth metadata as fallback or synchronizing reference
    const metaRole = user.app_metadata?.role || user.user_metadata?.role;
    if (metaRole === "ADMIN") {
      // If metadata has ADMIN but DB was not synced, sync DB role
      if (dbUser && dbUser.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
      return { authorized: true, user, dbUser };
    }

    return { authorized: false, user, dbUser, reason: "FORBIDDEN" };
  } catch (err) {
    console.error("getAdminSession error:", err);
    return { authorized: false, user: null, dbUser: null, reason: "FORBIDDEN" };
  }
}

/**
 * Guard utility for Route Handlers (API routes).
 * Returns NextResponse 401/403 if unauthorized, or null if authorized.
 */
export async function requireAdminApi(): Promise<{
  errorResponse: NextResponse | null;
  session: AdminSessionResult;
}> {
  const session = await getAdminSession();

  if (!session.authorized) {
    if (session.reason === "UNAUTHENTICATED") {
      return {
        errorResponse: NextResponse.json(
          { error: "Authentication required. Please sign in." },
          { status: 401 }
        ),
        session,
      };
    }
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      ),
      session,
    };
  }

  return { errorResponse: null, session };
}
