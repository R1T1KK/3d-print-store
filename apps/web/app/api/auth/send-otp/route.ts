import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail } from "@/lib/auth-validators";
import { generate6DigitOtp, saveOtp, canSendOtp, clearOtp, type OtpPurpose } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const purpose: OtpPurpose =
      body.purpose === "login" || body.purpose === "reset-password" ? body.purpose : "register";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 1. Enforce 60-second rate-limiting cooldown per email address
    const rateCheck = canSendOtp(email);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${rateCheck.waitSeconds}s before requesting another verification code.`,
          cooldown: rateCheck.waitSeconds,
        },
        { status: 429 }
      );
    }

    // 2. Generate strictly 6-digit numeric code securely on backend
    const otp = generate6DigitOtp();

    // 3. Save in OTP store with 5-minute expiry
    saveOtp(email, otp, { purpose, name, password });

    // 4. Dispatch email directly to recipient inbox via backend email service
    const emailResult = await sendOtpEmail({
      to: email,
      otp,
      purpose,
    });

    // 5. If email delivery fails, display a proper error instead of pretending it was sent
    if (!emailResult.success) {
      // Clear unsent OTP so user is not penalized by cooldown on failed delivery
      clearOtp(email);

      const isConfigError = emailResult.error?.toLowerCase().includes("not configured");
      const statusCode = isConfigError ? 503 : 500;

      return NextResponse.json(
        {
          error:
            emailResult.error ||
            `Failed to deliver email to ${email}. Please check backend email service credentials.`,
        },
        { status: statusCode }
      );
    }

    const purposeLabels = {
      register: "registration",
      login: "login",
      "reset-password": "password reset",
    };

    // 6. Return confirmation ONLY after backend email service confirms delivery.
    // The OTP is NEVER returned in the API response.
    return NextResponse.json({
      success: true,
      message: `A 6-digit ${purposeLabels[purpose]} code has been sent directly to ${email}.`,
      email,
      cooldown: 60,
    });
  } catch (err: unknown) {
    console.error("send-otp unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending the verification code." },
      { status: 500 }
    );
  }
}
