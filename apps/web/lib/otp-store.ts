import crypto from "crypto";

interface StoredOtpRecord {
  otp: string;
  expiresAt: number;
  name?: string;
  password?: string;
}

// Attach to globalThis to persist across Next.js dev server hot reloads
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, StoredOtpRecord>;
};

const store = globalForOtp.otpStore || new Map<string, StoredOtpRecord>();
if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpStore = store;
}

/**
 * Generates a strictly 6-digit cryptographically secure numeric OTP string (e.g. "839201").
 */
export function generate6DigitOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Stores a 6-digit OTP for an email address with a 10-minute expiry time.
 */
export function saveOtp(email: string, otp: string, meta?: { name?: string; password?: string }) {
  const normalizedEmail = email.trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  store.set(normalizedEmail, {
    otp: otp.trim(),
    expiresAt,
    name: meta?.name,
    password: meta?.password,
  });
}

/**
 * Validates a 6-digit OTP for an email address.
 * Removes OTP upon successful verification (single-use).
 */
export function verifyOtp(email: string, code: string): { valid: boolean; error?: string; meta?: { name?: string; password?: string } } {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const record = store.get(normalizedEmail);
  if (!record) {
    return {
      valid: false,
      error: "No verification code was requested for this email. Please click 'Verify with OTP'.",
    };
  }

  if (Date.now() > record.expiresAt) {
    store.delete(normalizedEmail);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (record.otp !== cleanCode) {
    return {
      valid: false,
      error: "Invalid 6-digit verification code. Please check your Gmail and try again.",
    };
  }

  // Single-use code consumed
  store.delete(normalizedEmail);

  return {
    valid: true,
    meta: {
      name: record.name,
      password: record.password,
    },
  };
}
