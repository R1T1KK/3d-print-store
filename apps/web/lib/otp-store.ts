import crypto from "crypto";

export type OtpPurpose = "register" | "login" | "reset-password";

export interface StoredOtpRecord {
  otp: string;
  purpose: OtpPurpose;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
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

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes strictly as specified
export const MAX_VERIFY_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown between resends

/**
 * Generates a strictly 6-digit cryptographically secure numeric OTP string (e.g. "839201").
 */
export function generate6DigitOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

/**
 * Normalizes email keys for consistent case-insensitive lookup.
 */
function normalizeKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks whether an OTP dispatch is permitted under rate-limiting cooldown.
 */
export function canSendOtp(email: string): { allowed: boolean; waitSeconds?: number } {
  const key = normalizeKey(email);
  const existing = store.get(key);

  if (!existing || !existing.lastSentAt) {
    return { allowed: true };
  }

  const elapsed = Date.now() - existing.lastSentAt;
  if (elapsed < RESEND_COOLDOWN_MS) {
    const remainingMs = RESEND_COOLDOWN_MS - elapsed;
    const waitSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    return { allowed: false, waitSeconds };
  }

  return { allowed: true };
}

/**
 * Stores a 6-digit OTP for an email address with a 10-minute expiry time
 * and records dispatch timestamp for rate limiting.
 */
export function saveOtp(
  email: string,
  otp: string,
  options?: {
    purpose?: OtpPurpose;
    name?: string;
    password?: string;
  }
) {
  const key = normalizeKey(email);
  const now = Date.now();
  const expiresAt = now + OTP_EXPIRY_MS;
  const purpose = options?.purpose || "register";

  store.set(key, {
    otp: otp.trim(),
    purpose,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    name: options?.name,
    password: options?.password,
  });
}

/**
 * Validates a 6-digit OTP for an email address.
 * Enforces:
 *  1. Verification code request existence
 *  2. 10-minute expiration
 *  3. Maximum attempts limit (5 attempts before invalidation)
 *  4. Matching OTP code
 *  5. Optional purpose match (register, login, reset-password)
 *
 * Consumes and deletes the OTP upon successful verification (single-use).
 */
export function verifyOtp(
  email: string,
  code: string,
  expectedPurpose?: OtpPurpose
): {
  valid: boolean;
  error?: string;
  meta?: {
    name?: string;
    password?: string;
    purpose?: OtpPurpose;
  };
} {
  const key = normalizeKey(email);
  const cleanCode = code.trim();

  const record = store.get(key);
  if (!record) {
    return {
      valid: false,
      error: "No verification code was requested for this email. Please click 'Send Code'.",
    };
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    store.delete(key);
    return {
      valid: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  // Check brute-force attempts
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    store.delete(key);
    return {
      valid: false,
      error: "Too many incorrect attempts. This code has been invalidated for security. Please request a new code.",
    };
  }

  // Check purpose mismatch if specified
  if (expectedPurpose && record.purpose && record.purpose !== expectedPurpose) {
    return {
      valid: false,
      error: `This verification code was issued for ${record.purpose}. Please request a new code for ${expectedPurpose}.`,
    };
  }

  // Check code match
  if (record.otp !== cleanCode) {
    record.attempts += 1;
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    return {
      valid: false,
      error:
        remaining > 0
          ? `Invalid 6-digit verification code (${remaining} attempt${remaining === 1 ? "" : "s"} remaining). Please check your Gmail.`
          : "Invalid verification code. Maximum attempts reached.",
    };
  }

  // Single-use code successfully consumed
  const meta = {
    name: record.name,
    password: record.password,
    purpose: record.purpose,
  };
  store.delete(key);

  return {
    valid: true,
    meta,
  };
}

/**
 * Manually invalidates an OTP for an email address.
 */
export function clearOtp(email: string): void {
  store.delete(normalizeKey(email));
}
