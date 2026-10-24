import nodemailer from "nodemailer";
import type { OtpPurpose } from "@/lib/otp-store";

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  purpose?: OtpPurpose;
}

export interface SendOtpEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a Nodemailer transporter using Gmail SMTP.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.
 */
export function getMailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Dispatches an email via Resend HTTP API if RESEND_API_KEY or EMAIL_API_KEY is configured.
 */
async function sendViaResend({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendOtpEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Resend API key not configured." };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "Fabric3D <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = (data && data.message) || response.statusText || "Resend API request failed";
      return { success: false, error: `Resend delivery failed: ${errMsg}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Resend error";
    return { success: false, error: `Resend network error: ${message}` };
  }
}

/**
 * Sends a real, high-contrast 6-digit OTP verification email directly to the recipient's Gmail inbox.
 * Never leaks the OTP to console or mock responses. Only returns success when the email service confirms delivery.
 */
export async function sendOtpEmail({
  to,
  otp,
  purpose = "register",
}: SendOtpEmailOptions): Promise<SendOtpEmailResult> {
  const gmailTransporter = getMailTransporter();
  const hasResend = Boolean(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);

  // If neither Gmail SMTP nor Resend credentials are configured
  if (!gmailTransporter && !hasResend) {
    return {
      success: false,
      error:
        "Email delivery service is not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to apps/web/.env.local (or configure RESEND_API_KEY).",
    };
  }

  let title = "Verify Your Email";
  let subtitle = "Use the following 6-digit verification code to complete your registration. This code expires in 5 minutes.";
  let subjectPrefix = "verification code";

  if (purpose === "login") {
    title = "Sign In to Your Account";
    subtitle = "Use the following 6-digit one-time code to authenticate your account. This code expires in 5 minutes. Never share this code.";
    subjectPrefix = "login code";
  } else if (purpose === "reset-password") {
    title = "Reset Your Password";
    subtitle = "We received a request to update your account credentials. Enter the 6-digit code below to set your new password. This code expires in 5 minutes.";
    subjectPrefix = "password reset code";
  }

  const subject = `${otp} is your FABRIC3D ${subjectPrefix}`;
  const text = `Your FABRIC3D ${subjectPrefix} is: ${otp}. It expires in 5 minutes.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your FABRIC3D Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; padding: 32px; text-align: center;">
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; padding: 6px 12px; background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; font-family: monospace; font-size: 11px; color: #06b6d4; text-transform: uppercase; letter-spacing: 2px;">
                FABRIC3D · Precision Manufacturing
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-bottom: 12px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding-bottom: 24px; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
              ${subtitle}
            </td>
          </tr>

          <!-- 6-Digit OTP Box -->
          <tr>
            <td align="center" style="padding: 16px 0 28px 0;">
              <div style="display: inline-block; background-color: #09090b; border: 2px solid #06b6d4; border-radius: 12px; padding: 16px 32px; font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #22d3ee; box-shadow: 0 0 24px rgba(6, 182, 212, 0.2);">
                ${otp}
              </div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="border-top: 1px solid #27272a; padding-top: 20px; font-size: 12px; color: #71717a; line-height: 1.5;">
              If you didn't request this code, you can safely disregard this email. Your FABRIC3D account remains protected.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // 1. Try Gmail SMTP if transporter is available
  if (gmailTransporter) {
    try {
      const senderEmail = process.env.GMAIL_USER;
      await gmailTransporter.sendMail({
        from: `"FABRIC3D" <${senderEmail}>`,
        to,
        subject,
        text,
        html,
      });

      return { success: true };
    } catch (err: unknown) {
      console.error("Gmail SMTP error:", err);
      const message = err instanceof Error ? err.message : "SMTP transport failure";
      return { success: false, error: `Gmail SMTP delivery failed: ${message}` };
    }
  }

  // 2. Try Resend if configured
  if (hasResend) {
    return await sendViaResend({ to, subject, html, text });
  }

  return {
    success: false,
    error: "No active email transport available. Please check environment variables.",
  };
}
