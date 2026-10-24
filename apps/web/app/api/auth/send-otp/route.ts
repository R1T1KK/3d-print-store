import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail } from "@/lib/auth-validators";
import { generate6DigitOtp, saveOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 1. Generate strictly 6-digit numeric code
    const otp = generate6DigitOtp();

    // 2. Save in OTP store with 10-minute expiry
    saveOtp(email, otp, { name, password });

    // 3. Send email to Gmail via Gmail SMTP Nodemailer
    const emailResult = await sendOtpEmail({
      to: email,
      otp,
    });

    if (!emailResult.success) {
      console.warn("Gmail SMTP delivery warning:", emailResult.error);

      // Check if credentials are missing
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return NextResponse.json(
          {
            error: "Gmail SMTP is not configured yet. Please add GMAIL_USER and GMAIL_APP_PASSWORD to apps/web/.env.local to deliver OTPs to your Gmail inbox.",
            missingConfig: true,
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `Failed to deliver email to ${email}: ${emailResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent directly to ${email}.`,
      email,
    });
  } catch (err: unknown) {
    console.error("send-otp unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending the OTP code." },
      { status: 500 }
    );
  }
}
