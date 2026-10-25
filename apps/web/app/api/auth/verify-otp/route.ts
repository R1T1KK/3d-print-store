import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail } from "@/lib/auth-validators";
import { verifyOtp, type OtpPurpose } from "@/lib/otp-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserProfile } from "@/lib/supabase/sync-user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const purpose: OtpPurpose | undefined =
      body.purpose === "login" || body.purpose === "reset-password" || body.purpose === "register"
        ? body.purpose
        : undefined;
    const fallbackPassword = typeof body.password === "string" ? body.password : undefined;
    const fallbackName = typeof body.name === "string" ? body.name.trim() : undefined;
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : fallbackPassword;

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
    const verification = verifyOtp(email, code, purpose);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    const resolvedPurpose: OtpPurpose = verification.meta?.purpose || purpose || "register";
    const admin = createAdminClient();

    // =========================================================================
    // Scenario A: Password Reset via 6-digit OTP
    // =========================================================================
    if (resolvedPurpose === "reset-password") {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json(
          { error: "Please provide a new password with at least 8 characters." },
          { status: 400 }
        );
      }

      // Find user by email in Supabase
      const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
      if (listError) {
        console.error("Supabase listUsers error in reset-password:", listError);
      }

      const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);
      if (!existingUser) {
        return NextResponse.json(
          { error: "No account found matching this email address. Please register for an account." },
          { status: 404 }
        );
      }

      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: newPassword,
          email_confirm: true,
        }
      );

      if (updateError) {
        console.error("Supabase updateUserById error in reset-password:", updateError);
        return NextResponse.json(
          { error: updateError.message || "Failed to update password. Please try again." },
          { status: 500 }
        );
      }

      if (updated?.user) {
        await syncUserProfile(updated.user);
      }

      return NextResponse.json({
        success: true,
        purpose: "reset-password",
        message: "Your password has been successfully updated. You can now log in.",
        email,
      });
    }

    // =========================================================================
    // Scenario B: Passwordless Sign-In via 6-digit OTP
    // =========================================================================
    if (resolvedPurpose === "login") {
      // Find or create user so they can receive an authenticated session
      let targetUser = null;
      const { data: usersData } = await admin.auth.admin.listUsers();
      const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);

      if (existingUser) {
        targetUser = existingUser;
      } else {
        // Auto-create account for new customer logging in via OTP
        const fallbackDisplayName = email.split("@")[0];
        const { data: createData, error: createError } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            name: fallbackDisplayName,
            full_name: fallbackDisplayName,
          },
        });
        if (createError) {
          console.error("Error creating user during OTP login:", createError);
        }
        targetUser = createData?.user || null;
      }

      if (targetUser) {
        await syncUserProfile(targetUser);
      }

      // Generate a magic link / session token for the browser client
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkError || !linkData?.properties) {
        console.error("Failed to generate login token link:", linkError);
        return NextResponse.json(
          { error: "Failed to create authentication session. Please try again." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        purpose: "login",
        message: "Login code verified successfully!",
        email,
        token_hash: linkData.properties.hashed_token,
        verification_type: linkData.properties.verification_type || "magiclink",
        action_link: linkData.properties.action_link,
      });
    }

    // =========================================================================
    // Scenario C: Customer Registration Email Ownership Verification
    // =========================================================================
    const resolvedPassword =
      verification.meta?.password || fallbackPassword || "Fabric3D!SecurePass2026";
    const resolvedName =
      verification.meta?.name || fallbackName || email.split("@")[0];

    let supabaseUser = null;

    try {
      // Create user directly with confirmed status
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
        // If already exists, confirm email and update metadata
        if (errMsg.includes("already registered") || errMsg.includes("user already exists")) {
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
          console.error("Supabase admin createUser error in verify-otp:", createRes.error);
        }
      }
    } catch (err: unknown) {
      console.error("Error setting up Supabase user in verify-otp:", err);
    }

    // Synchronize user in PostgreSQL Prisma database
    if (supabaseUser) {
      await syncUserProfile(supabaseUser);
    }

    return NextResponse.json({
      success: true,
      purpose: "register",
      message: "Email verified successfully!",
      email,
    });
  } catch (err: unknown) {
    console.error("verify-otp unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while verifying the OTP." },
      { status: 500 }
    );
  }
}
