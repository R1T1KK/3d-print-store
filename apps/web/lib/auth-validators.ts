/**
 * Shared authentication and security validation functions.
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  meetsLength: boolean;
  hasNumber: boolean;
  hasUpper: boolean;
  hasSpecial: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const meetsLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (meetsLength) score += 1;
  if (hasNumber) score += 1;
  if (hasUpper) score += 1;
  if (hasSpecial) score += 1;

  if (password.length === 0) {
    return {
      score: 0,
      label: "",
      color: "bg-zinc-800",
      meetsLength,
      hasNumber,
      hasUpper,
      hasSpecial,
    };
  }

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "bg-rose-500", meetsLength, hasNumber, hasUpper, hasSpecial };
    case 2:
      return { score: 2, label: "Fair", color: "bg-amber-500", meetsLength, hasNumber, hasUpper, hasSpecial };
    case 3:
      return { score: 3, label: "Good", color: "bg-cyan-500", meetsLength, hasNumber, hasUpper, hasSpecial };
    case 4:
      return { score: 4, label: "Strong", color: "bg-emerald-500", meetsLength, hasNumber, hasUpper, hasSpecial };
    default:
      return { score: 0, label: "Too Short", color: "bg-rose-500", meetsLength, hasNumber, hasUpper, hasSpecial };
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeCustomerProfileUpdate(body: Record<string, unknown>): {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
} {
  const sanitized: Record<string, string> = {};

  const allowedStringFields = [
    "name",
    "phone",
    "line1",
    "line2",
    "city",
    "state",
    "postalCode",
    "country",
  ];

  for (const field of allowedStringFields) {
    if (typeof body[field] === "string") {
      sanitized[field] = (body[field] as string).trim();
    }
  }

  return sanitized;
}

export function isValidOtpCode(otp: string): boolean {
  return /^[0-9a-zA-Z]{6}$/.test(otp.trim());
}

export function sanitizeOtpCode(otp: string): string {
  return otp.replace(/[^0-9a-zA-Z]/g, "").toUpperCase().slice(0, 6);
}

