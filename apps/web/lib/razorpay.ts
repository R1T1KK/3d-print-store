/**
 * Server-side Razorpay helper utilities.
 * Source of Truth: SPEC.md §8, ARCHITECTURE.md §2 & SECURITY.md §4
 *
 * Rules:
 * - Server credentials only. Never expose RAZORPAY_KEY_SECRET to client.
 * - Always calculate amount strictly in integer paise.
 * - Signatures verified using HMAC-SHA256 with timing-safe comparisons.
 */

import crypto from "crypto";
import Razorpay from "razorpay";

export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("[YOUR-") &&
    !keySecret.includes("[YOUR-")
  );
}

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.includes("[YOUR-") || keySecret.includes("[YOUR-")) {
    throw new Error(
      "Razorpay credentials are not configured in environment (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Creates an order on Razorpay servers using verified amount in integer paise.
 */
export async function createRazorpayOrderSession(params: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; keyId: string }> {
  const client = getRazorpayClient();
  const keyId = process.env.RAZORPAY_KEY_ID!;

  const razorpayOrder = await client.orders.create({
    amount: params.amountPaise,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes,
  });

  return {
    id: razorpayOrder.id,
    amount: Number(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    keyId,
  };
}

/**
 * Verifies Razorpay checkout modal payment signature on the server.
 * expected_signature = HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpayPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const a = Buffer.from(generatedSignature);
    const b = Buffer.from(params.razorpaySignature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook event payload signature.
 * expected_signature = HMAC_SHA256(raw_request_body, webhook_secret)
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !params.signature) return false;

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(params.rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(generatedSignature);
    const b = Buffer.from(params.signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
