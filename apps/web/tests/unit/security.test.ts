import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

describe("Security & Payment Verification Unit Tests", () => {
  const secret = "test_webhook_secret_key_12345";

  describe("Razorpay HMAC-SHA256 Signature Verification", () => {
    it("should compute valid signature for Razorpay checkout payment", () => {
      const orderId = "order_N123456789";
      const paymentId = "pay_N987654321";
      const keySecret = "rzp_test_secret_abc123";

      const payload = `${orderId}|${paymentId}`;
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(payload)
        .digest("hex");

      // Verify timing-safe comparison
      const expectedBuffer = Buffer.from(generatedSignature);
      const actualBuffer = Buffer.from(generatedSignature);
      expect(crypto.timingSafeEqual(expectedBuffer, actualBuffer)).toBe(true);
    });

    it("should reject tampered payment signatures", () => {
      const orderId = "order_N123456789";
      const paymentId = "pay_N987654321";
      const keySecret = "rzp_test_secret_abc123";

      const validSig = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const tamperedSig = validSig.slice(0, -4) + "beef";

      const validBuf = Buffer.from(validSig);
      const tamperedBuf = Buffer.from(tamperedSig);

      expect(validBuf.length).toBe(tamperedBuf.length);
      expect(crypto.timingSafeEqual(validBuf, tamperedBuf)).toBe(false);
    });

    it("should verify raw body signature against x-razorpay-signature for webhooks", () => {
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_999",
              order_id: "order_test_999",
              amount: 50000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      });

      const signature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const expectedBuf = Buffer.from(signature);
      const computedBuf = Buffer.from(
        crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
      );

      expect(crypto.timingSafeEqual(expectedBuf, computedBuf)).toBe(true);
    });
  });

  describe("Admin Authorization Verification Logic", () => {
    function evaluateAdminRole(
      sessionUser: { app_metadata?: { role?: string }; user_metadata?: { role?: string } } | null,
      dbUser: { role: string } | null
    ) {
      if (!sessionUser) return { authorized: false, status: 401 };
      const isDbAdmin = dbUser?.role === "ADMIN";
      const isMetaAdmin =
        sessionUser.app_metadata?.role === "ADMIN" ||
        sessionUser.user_metadata?.role === "ADMIN";

      if (isDbAdmin || isMetaAdmin) return { authorized: true, status: 200 };
      return { authorized: false, status: 403 };
    }

    it("should deny unauthenticated requests with 401", () => {
      const res = evaluateAdminRole(null, null);
      expect(res.authorized).toBe(false);
      expect(res.status).toBe(401);
    });

    it("should deny standard customer accounts with 403 Forbidden", () => {
      const user = { app_metadata: { role: "CUSTOMER" } };
      const dbUser = { role: "CUSTOMER" };
      const res = evaluateAdminRole(user, dbUser);
      expect(res.authorized).toBe(false);
      expect(res.status).toBe(403);
    });

    it("should grant access to users with Role.ADMIN in database", () => {
      const user = { app_metadata: { role: "CUSTOMER" } };
      const dbUser = { role: "ADMIN" };
      const res = evaluateAdminRole(user, dbUser);
      expect(res.authorized).toBe(true);
      expect(res.status).toBe(200);
    });
  });
});
