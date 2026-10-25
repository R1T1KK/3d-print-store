import nodemailer from "nodemailer";

interface SendOtpEmailOptions {
  to: string;
  otp: string;
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
 * Sends a high-contrast, premium 6-digit OTP verification email directly to Gmail.
 */
export async function sendOtpEmail({ to, otp }: SendOtpEmailOptions): Promise<{ success: boolean; error?: string }> {
  const transporter = getMailTransporter();

  if (!transporter) {
    return {
      success: false,
      error: "GMAIL_USER and GMAIL_APP_PASSWORD are not configured in environment variables.",
    };
  }

  const senderEmail = process.env.GMAIL_USER;

  const htmlContent = `
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
                Verify Your Email
              </h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding-bottom: 24px; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
              Use the following 6-digit verification code to complete your registration. This code expires in 10 minutes.
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
              If you didn't request this verification code, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"FABRIC3D" <${senderEmail}>`,
      to,
      subject: `${otp} is your FABRIC3D verification code`,
      text: `Your FABRIC3D verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to send email via Gmail SMTP:", err);
    const message = err instanceof Error ? err.message : "Unknown SMTP error";
    return { success: false, error: message };
  }
}
