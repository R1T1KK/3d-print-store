import { createClient } from "@/lib/supabase/server";
import { syncUserProfile } from "@/lib/supabase/sync-user";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token_hash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const redirect = requestUrl.searchParams.get("redirect") || "/account";

  const supabase = await createClient();

  // 1. Handle PKCE authorization code exchange
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Synchronize Supabase user into PostgreSQL Prisma database
      await syncUserProfile(data.user);

      // If this was a password recovery callback, forward directly to the reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
      }

      // If email verification just completed, redirect with confirmation notice
      const destination = redirect.startsWith("/") ? redirect : "/account";
      const target = new URL(destination, requestUrl.origin);
      if (destination === "/login") {
        target.searchParams.set("verified", "true");
      }
      return NextResponse.redirect(target);
    }

    if (error) {
      console.error("Auth callback exchange error:", error.message);
      const errorUrl = new URL("/login", requestUrl.origin);
      errorUrl.searchParams.set("error", "The verification or reset link has expired or is invalid.");
      return NextResponse.redirect(errorUrl);
    }
  }

  // 2. Handle email OTP token hash verification (from Supabase email confirmation links)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!error && data?.user) {
      await syncUserProfile(data.user);

      if (type === "recovery") {
        return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
      }

      const destination = redirect.startsWith("/") ? redirect : "/account";
      const target = new URL(destination, requestUrl.origin);
      return NextResponse.redirect(target);
    }

    if (error) {
      console.error("Auth callback token_hash error:", error.message);
      const errorUrl = new URL("/login", requestUrl.origin);
      errorUrl.searchParams.set("error", "The verification link is invalid or has already expired.");
      return NextResponse.redirect(errorUrl);
    }
  }

  // Fallback if no valid code or token_hash present
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

