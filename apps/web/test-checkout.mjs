import assert from "node:assert/strict";
import crypto from "crypto";

console.log("=== Running Milestone M3: Checkout, Razorpay & Security Verification Suite ===\n");

// ---------------------------------------------------------------------------
// 1. Razorpay Payment Signature Verification Tests
// ---------------------------------------------------------------------------
console.log("Test 1: Server-side Razorpay Payment HMAC-SHA256 Signature Verification...");

function verifyPaymentSig(orderId, paymentId, signature, secret) {
  if (!secret || !signature) return false;
  const payload = `${orderId}|${paymentId}`;
  const generated = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(generated);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const TEST_SECRET = "test_razorpay_secret_key_m3_2026";
const validOrderId = "order_N9zQ21abcde";
const validPaymentId = "pay_N9zR32fghij";
const validPaymentSig = crypto
  .createHmac("sha256", TEST_SECRET)
  .update(`${validOrderId}|${validPaymentId}`)
  .digest("hex");

// 1a. Valid signature must pass
assert.equal(
  verifyPaymentSig(validOrderId, validPaymentId, validPaymentSig, TEST_SECRET),
  true,
  "Valid HMAC-SHA256 signature must be verified successfully"
);

// 1b. Tampered order ID must fail
assert.equal(
  verifyPaymentSig("order_TAMPERED", validPaymentId, validPaymentSig, TEST_SECRET),
  false,
  "Tampered order ID must fail signature verification"
);

// 1c. Tampered payment ID must fail
assert.equal(
  verifyPaymentSig(validOrderId, "pay_TAMPERED", validPaymentSig, TEST_SECRET),
  false,
  "Tampered payment ID must fail signature verification"
);

// 1d. Tampered signature must fail
assert.equal(
  verifyPaymentSig(validOrderId, validPaymentId, "bad_signature_hex_0000000000", TEST_SECRET),
  false,
  "Altered signature string must fail signature verification"
);

// 1e. Incorrect secret must fail
assert.equal(
  verifyPaymentSig(validOrderId, validPaymentId, validPaymentSig, "wrong_secret"),
  false,
  "Signature verified with incorrect secret must fail"
);

console.log("  ✓ Razorpay payment signature checks passed (valid, tampered payload, timing-safe).");

// ---------------------------------------------------------------------------
// 2. Razorpay Webhook Signature Verification Tests
// ---------------------------------------------------------------------------
console.log("\nTest 2: Server-side Razorpay Webhook HMAC-SHA256 Verification...");

function verifyWebhookSig(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const generated = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(generated);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

const WEBHOOK_SECRET = "whsec_secure_random_production_m3_key";
const webhookPayload = JSON.stringify({
  entity: "event",
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: "pay_WH12345678",
        order_id: "order_WH87654321",
        amount: 84900,
        status: "captured",
      },
    },
  },
});
const validWebhookSig = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(webhookPayload)
  .digest("hex");

assert.equal(
  verifyWebhookSig(webhookPayload, validWebhookSig, WEBHOOK_SECRET),
  true,
  "Valid webhook signature with untouched raw body must pass"
);

// Tampered payload (e.g. amount altered in transit)
const tamperedPayload = webhookPayload.replace("84900", "100");
assert.equal(
  verifyWebhookSig(tamperedPayload, validWebhookSig, WEBHOOK_SECRET),
  false,
  "Tampered webhook payload body must fail signature check"
);

assert.equal(
  verifyWebhookSig(webhookPayload, "tampered_sig_string", WEBHOOK_SECRET),
  false,
  "Tampered webhook header signature must fail"
);

console.log("  ✓ Razorpay webhook raw-body signature checks passed.");

// ---------------------------------------------------------------------------
// 3. Webhook Idempotency & Safe State Transitions
// ---------------------------------------------------------------------------
console.log("\nTest 3: Webhook Idempotency & State Transition Safety...");

class OrderStateMachine {
  constructor(initialStatus = "PENDING_PAYMENT") {
    this.status = initialStatus;
    this.processedEvents = new Set();
    this.paymentRef = null;
  }

  handleWebhookPaymentCaptured(eventId, paymentId) {
    // Deduplication check
    if (this.processedEvents.has(eventId)) {
      return { handled: true, deduplicated: true, status: this.status };
    }

    if (this.status === "PAID") {
      this.processedEvents.add(eventId);
      return { handled: true, deduplicated: true, status: this.status };
    }

    if (this.status !== "PENDING_PAYMENT") {
      throw new Error(`Cannot transition order in state '${this.status}' to PAID`);
    }

    this.status = "PAID";
    this.paymentRef = paymentId;
    this.processedEvents.add(eventId);
    return { handled: true, deduplicated: false, status: this.status };
  }
}

const sm = new OrderStateMachine("PENDING_PAYMENT");
// First delivery
const r1 = sm.handleWebhookPaymentCaptured("evt_001", "pay_001");
assert.equal(r1.status, "PAID");
assert.equal(r1.deduplicated, false);
assert.equal(sm.paymentRef, "pay_001");

// Second duplicate delivery with same event ID
const r2 = sm.handleWebhookPaymentCaptured("evt_001", "pay_001");
assert.equal(r2.status, "PAID");
assert.equal(r2.deduplicated, true, "Duplicate event delivery must be idempotently ignored");

// Third delivery with different event ID for already paid order
const r3 = sm.handleWebhookPaymentCaptured("evt_002", "pay_001");
assert.equal(r3.status, "PAID");
assert.equal(r3.deduplicated, true, "Paid order must remain PAID without error or re-execution");

// Disallow transitioning CANCELLED order to PAID
const cancelledSm = new OrderStateMachine("CANCELLED");
assert.throws(
  () => cancelledSm.handleWebhookPaymentCaptured("evt_003", "pay_003"),
  /Cannot transition order in state 'CANCELLED' to PAID/
);

console.log("  ✓ Webhook idempotency and state machine transitions verified.");

// ---------------------------------------------------------------------------
// 4. Server-Side Price Verification & Anti-Price-Tampering
// ---------------------------------------------------------------------------
console.log("\nTest 4: Server-Side Price Recalculation & Anti-Tampering...");

// Database catalog mock
const DB_CATALOG = {
  "prod-1": { id: "prod-1", price: 84900, name: "Planetary Gear" },
  "prod-2": { id: "prod-2", price: 129900, name: "Voron Stealthburner Toolhead" },
};

function serverCalculateOrder(items, clientDeclaredTotal) {
  let subtotalPaise = 0;

  for (const item of items) {
    if (item.type === "catalog") {
      const dbProd = DB_CATALOG[item.productId];
      if (!dbProd) throw new Error(`Product ${item.productId} not found`);
      // Ignore whatever item.price client sent! Use dbProd.price
      subtotalPaise += dbProd.price * Math.max(1, Math.floor(item.quantity));
    }
  }

  // Free shipping threshold: ₹999 = 99,900 paise
  const shippingFeePaise = subtotalPaise >= 99900 || items.length === 0 ? 0 : 7900;
  const verifiedTotalPaise = subtotalPaise + shippingFeePaise;

  // Verify anti-tampering: if client tried to claim total was 100 paise (₹1)
  const isTampered = clientDeclaredTotal !== undefined && clientDeclaredTotal !== verifiedTotalPaise;

  return { subtotalPaise, shippingFeePaise, verifiedTotalPaise, isTampered };
}

// 4a. Client sends honest request
const honestOrder = serverCalculateOrder(
  [{ type: "catalog", productId: "prod-1", quantity: 1, price: 84900 }],
  84900 + 7900 // 92800 paise
);
assert.equal(honestOrder.verifiedTotalPaise, 92800);
assert.equal(honestOrder.shippingFeePaise, 7900);
assert.equal(honestOrder.isTampered, false);

// 4b. Attacker alters client request price to ₹1 (100 paise)
const tamperedOrder = serverCalculateOrder(
  [{ type: "catalog", productId: "prod-1", quantity: 1, price: 100 }],
  100
);
assert.equal(
  tamperedOrder.verifiedTotalPaise,
  92800,
  "Server MUST use database product price (₹849), ignoring client declared ₹1"
);
assert.equal(tamperedOrder.isTampered, true, "Server detects price tampering attempt");

// 4c. Free shipping applied strictly above ₹999 (99,900 paise)
const freeShippingOrder = serverCalculateOrder(
  [{ type: "catalog", productId: "prod-2", quantity: 1, price: 129900 }],
  129900
);
assert.equal(freeShippingOrder.subtotalPaise, 129900);
assert.equal(freeShippingOrder.shippingFeePaise, 0, "Order >= ₹999 must have ₹0 shipping fee");
assert.equal(freeShippingOrder.verifiedTotalPaise, 129900);

console.log("  ✓ Server-side price recalculation & anti-tampering verified.");

// ---------------------------------------------------------------------------
// 5. Custom Quote Ownership, Expiry & Duplicate Reuse Validation
// ---------------------------------------------------------------------------
console.log("\nTest 5: Quote Ownership, Expiry & Duplicate Reuse Rules...");

function validateQuoteEligibility(quote, currentUserId, now = new Date()) {
  if (!quote) {
    return { valid: false, error: "Quote not found" };
  }
  if (quote.userId && quote.userId !== currentUserId) {
    return { valid: false, error: "Unauthorized: quote belongs to another user" };
  }
  if (quote.expiresAt && new Date(quote.expiresAt).getTime() < now.getTime()) {
    return { valid: false, error: "Quote has expired. Please re-slice model for an updated quote." };
  }
  if (quote.jobStatus !== "PENDING") {
    return { valid: false, error: `Quote cannot be checked out; current status is ${quote.jobStatus}` };
  }
  return { valid: true };
}

const mockNow = new Date("2026-10-24T12:00:00Z");
const validQuote = {
  id: "quote-1",
  userId: "user-alice",
  priceTotal: 45000,
  jobStatus: "PENDING",
  expiresAt: new Date("2026-10-31T12:00:00Z"),
};

// 5a. Alice checks out her own valid quote
assert.equal(validateQuoteEligibility(validQuote, "user-alice", mockNow).valid, true);

// 5b. Bob attempts to steal and checkout Alice's quote
const bobAttempt = validateQuoteEligibility(validQuote, "user-bob", mockNow);
assert.equal(bobAttempt.valid, false);
assert.match(bobAttempt.error, /Unauthorized: quote belongs to another user/);

// 5c. Expired quote is rejected
const expiredQuote = {
  ...validQuote,
  expiresAt: new Date("2026-10-20T12:00:00Z"), // 4 days ago
};
const expiredAttempt = validateQuoteEligibility(expiredQuote, "user-alice", mockNow);
assert.equal(expiredAttempt.valid, false);
assert.match(expiredAttempt.error, /Quote has expired/);

// 5d. Duplicate quote reuse: quote already associated with paid order / approved
const alreadyPaidQuote = {
  ...validQuote,
  jobStatus: "APPROVED",
};
const duplicateAttempt = validateQuoteEligibility(alreadyPaidQuote, "user-alice", mockNow);
assert.equal(duplicateAttempt.valid, false);
assert.match(duplicateAttempt.error, /cannot be checked out; current status is APPROVED/);

console.log("  ✓ Quote ownership, expiry, and duplicate reuse protections verified.");

// ---------------------------------------------------------------------------
// 6. Indian Postal Code & Phone Validation Rules
// ---------------------------------------------------------------------------
console.log("\nTest 6: Shipping Address & Contact Validation...");

const PIN_REGEX = /^[1-9][0-9]{5}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;

assert.equal(PIN_REGEX.test("560001"), true, "Bangalore GPO PIN is valid");
assert.equal(PIN_REGEX.test("110001"), true, "New Delhi Connaught Place PIN is valid");
assert.equal(PIN_REGEX.test("012345"), false, "PIN starting with 0 is invalid");
assert.equal(PIN_REGEX.test("56000"), false, "5-digit PIN is invalid");
assert.equal(PIN_REGEX.test("5600012"), false, "7-digit PIN is invalid");
assert.equal(PIN_REGEX.test("56000A"), false, "Alpha PIN is invalid");

assert.equal(PHONE_REGEX.test("9876543210"), true, "10-digit Indian mobile is valid");
assert.equal(PHONE_REGEX.test("8765432109"), true, "Valid 8-prefix mobile");
assert.equal(PHONE_REGEX.test("5555555555"), false, "5-prefix is invalid in India");
assert.equal(PHONE_REGEX.test("987654321"), false, "9-digit phone is invalid");
assert.equal(PHONE_REGEX.test("98765432101"), false, "11-digit phone is invalid");

console.log("  ✓ Indian shipping PIN and mobile format validators verified.");

console.log("\n==================================================================");
console.log("ALL 6 MILESTONE M3 CHECKOUT & PAYMENT SECURITY TEST SUITES PASSED!");
console.log("==================================================================");
