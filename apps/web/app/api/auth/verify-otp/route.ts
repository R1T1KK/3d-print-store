import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail } from "@/lib/auth-validators";
import { verifyOtp } from "@/lib/otp-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserProfile } from "@/lib/supabase/sync-user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const fallbackPassword = typeof body.password === "string" ? body.password : undefined;
    const fallbackName = typeof body.name === "string" ? body.name.trim() : undefined;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Please enter the complete 6-digit verification code." },
        { status: 400 }
      );
    }

    // 1. Verify 6-digit code against single-use OTP store
    const verification = verifyOtp(email, code);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    const resolvedPassword = verification.meta?.password || fallbackPassword || "Fabric3D!SecurePass2026";
    const resolvedName = verification.meta?.name || fallbackName || email.split("@")[0];

    // 2. Synchronize user in Supabase Auth via Admin Client
    const admin = createAdminClient();

    // Check if user already exists
    let supabaseUser = null;

    try {
      // Try to create user directly with confirmed email status
      const createRes = await admin.auth.admin.createUser({
        email,
        password: resolvedPassword,
        email_confirm: true,
        user_metadata: {
          name: resolvedName,
          full_name: resolvedName,
        },
      });

      if (createRes.data?.user) {
        supabaseUser = createRes.data.user;
      } else if (createRes.error) {
        const errMsg = createRes.error.message.toLowerCase();
        // If already exists, confirm their email
        if (errMsg.includes("already registered") || errMsg.includes("user already exists")) {
          // Find the existing user
          const { data: usersData } = await admin.auth.admin.listUsers();
          const existing = usersData?.users.find((u) => u.email?.toLowerCase() === email);
          if (existing) {
            const updateRes = await admin.auth.admin.updateUserById(existing.id, {
              email_confirm: true,
              password: resolvedPassword,
              user_metadata: {
                name: resolvedName,
                full_name: resolvedName,
              },
            });
            supabaseUser = updateRes.data?.user || existing;
          }
        } else {
          console.error("Supabase admin createUser error:", createRes.error);
        }
      }
    } catch (err: unknown) {
      console.error("Error setting up Supabase user in verify-otp:", err);
    }

    // 3. Synchronize user in PostgreSQL Prisma database
    if (supabaseUser) {
      await syncUserProfile(supabaseUser);
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully!",
      email,
      verifiedPassword: resolvedPassword,
    });
  } catch (err: unknown) {
    console.error("verify-otp unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying the OTP." },
      { status: 500 }
    );
  }
}
