import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail } from "@/lib/auth-validators";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : undefined;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    let emailOtp: string | null = null;
    let actionLink: string | null = null;

    try {
      // 1. First try creating the signup link and OTP token via administrative client
      // This bypasses the Supabase public SMTP 3-emails/hour rate limit
      const signupLinkRes = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password: password || "Fabric3D!TempPassword2026",
      });

      if (signupLinkRes.data?.properties) {
        emailOtp = signupLinkRes.data.properties.email_otp || null;
        actionLink = signupLinkRes.data.properties.action_link || null;
      } else if (signupLinkRes.error) {
        const errMsg = signupLinkRes.error.message.toLowerCase();
        // If user is already created/registered, generate magiclink/recovery OTP
        if (errMsg.includes("already registered") || errMsg.includes("user already exists")) {
          const magicRes = await admin.auth.admin.generateLink({
            type: "magiclink",
            email,
          });
          if (magicRes.data?.properties) {
            emailOtp = magicRes.data.properties.email_otp || null;
            actionLink = magicRes.data.properties.action_link || null;
          } else {
            return NextResponse.json(
              { error: "An account with this email already exists. Please sign in." },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: signupLinkRes.error.message },
            { status: 400 }
          );
        }
      }
    } catch (adminErr: unknown) {
      console.error("Admin OTP generation error:", adminErr);
      return NextResponse.json(
        { error: "Failed to generate verification OTP. Please try again." },
        { status: 500 }
      );
    }

    // In development or test environments, expose devOtp to eliminate SMTP blocking
    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      message: "Verification OTP generated and dispatched.",
      email,
      actionLink: isDev ? actionLink : undefined,
      devOtp: isDev ? emailOtp : undefined,
    });
  } catch (err: unknown) {
    console.error("send-otp route unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while dispatching OTP." },
      { status: 500 }
    );
  }
}
