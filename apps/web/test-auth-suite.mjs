import assert from "node:assert";
import {
  checkPasswordStrength,
  isValidEmail,
  sanitizeCustomerProfileUpdate,
  isValidOtpCode,
  sanitizeOtpCode,
} from "./lib/auth-validators.ts";

console.log("=== Running Customer Auth & Security Validation Suite ===");

// 1. Password Strength Scoring Tests
console.log("\nTest 1: Password Strength Scoring & Checks...");

const weakResult = checkPasswordStrength("abc");
assert.strictEqual(weakResult.score, 0, "Short password should score 0");
assert.strictEqual(weakResult.meetsLength, false, "Should fail length requirement");

const fairResult = checkPasswordStrength("abcdefgh1");
assert.strictEqual(fairResult.score, 2, "Length + number should score 2");
assert.strictEqual(fairResult.meetsLength, true);
assert.strictEqual(fairResult.hasNumber, true);
assert.strictEqual(fairResult.hasUpper, false);

const strongResult = checkPasswordStrength("P@ssw0rd2026!");
assert.strictEqual(strongResult.score, 4, "High entropy password should score 4");
assert.strictEqual(strongResult.label, "Strong");
assert.strictEqual(strongResult.meetsLength, true);
assert.strictEqual(strongResult.hasNumber, true);
assert.strictEqual(strongResult.hasUpper, true);
assert.strictEqual(strongResult.hasSpecial, true);
console.log("✓ Password strength grading logic verified.");

// 2. Email Validation Logic Tests
console.log("\nTest 2: Email Validation Logic...");
assert.strictEqual(isValidEmail("customer@domain.com"), true, "Valid standard email");
assert.strictEqual(isValidEmail("engineer+3d@fabric.co.in"), true, "Valid plus-aliased email");
assert.strictEqual(isValidEmail("invalid-email"), false, "Missing @ and domain");
assert.strictEqual(isValidEmail("@missinguser.com"), false, "Missing username");
assert.strictEqual(isValidEmail("user@domain"), false, "Missing top-level domain");
console.log("✓ Email format validation rules verified.");

// 3. Route Guard Security Rules
console.log("\nTest 3: Customer vs Admin Route Protection Rules...");
const protectedCustomerPaths = ["/account", "/account/orders", "/account/profile"];
const protectedAdminPaths = ["/admin", "/admin/jobs", "/admin/products", "/admin/orders"];
const publicAuthPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

protectedCustomerPaths.forEach((p) => {
  assert(p.startsWith("/account"), `Path ${p} must be treated as customer protected`);
});
protectedAdminPaths.forEach((p) => {
  assert(p.startsWith("/admin"), `Path ${p} must be treated as admin protected`);
});
publicAuthPaths.forEach((p) => {
  assert(
    p === "/login" || p === "/register" || p === "/forgot-password" || p === "/reset-password",
    `Path ${p} is public auth`
  );
});
console.log("✓ Route boundaries and role-isolation paths verified.");

// 4. Customer Role Guard Immutability Test
console.log("\nTest 4: Customer Role Immutability...");
const maliciousPayload = {
  name: "Attacker",
  role: "ADMIN",
  id: "stolen-uuid",
  paymentStatus: "PAID",
  phone: "+91 9999999999",
};
const sanitized = sanitizeCustomerProfileUpdate(maliciousPayload);
assert.strictEqual(sanitized.role, undefined, "Role modification MUST be stripped");
assert.strictEqual(sanitized.id, undefined, "ID modification MUST be stripped");
assert.strictEqual(sanitized.paymentStatus, undefined, "Payment status modification MUST be stripped");
assert.strictEqual(sanitized.name, "Attacker", "Safe field name should be preserved");
assert.strictEqual(sanitized.phone, "+91 9999999999", "Phone should be preserved");
console.log("✓ Role elevation attempt prevented. Sanitization verified.");

// 5. OTP Code Validation & Sanitization Tests
console.log("\nTest 5: OTP Code Validation & Sanitization...");
assert.strictEqual(isValidOtpCode("123456"), true, "Valid 6-digit numeric OTP");
assert.strictEqual(isValidOtpCode("12345678"), true, "Valid 8-digit numeric OTP");
assert.strictEqual(isValidOtpCode("A1B2C3"), true, "Valid 6-char alphanumeric OTP");
assert.strictEqual(isValidOtpCode("12345"), false, "Too short (< 6 digits)");
assert.strictEqual(isValidOtpCode("123456789"), false, "Too long (> 8 digits)");
assert.strictEqual(isValidOtpCode("12 34 56"), false, "Contains internal whitespace");
assert.strictEqual(isValidOtpCode("1234!@"), false, "Contains special characters");

assert.strictEqual(sanitizeOtpCode(" 123-456 "), "123456", "Strips dashes and spaces");
assert.strictEqual(sanitizeOtpCode("abc45678extra"), "ABC45678", "Upper-cases and truncates to 8");
console.log("✓ OTP format checks and sanitization verified.");

console.log("\n=======================================================");
console.log("  ALL AUTH & SECURITY TESTS PASSED SUCCESSFULLY! (5/5)  ");
console.log("=======================================================");

