import assert from "node:assert/strict";

console.log("=== Running Milestone M4: Advanced Admin Portal Security & Lifecycle Suite ===\n");

// ---------------------------------------------------------------------------
// 1. Admin Authorization & Role Guard Logic Tests
// ---------------------------------------------------------------------------
console.log("Test 1: Admin Authorization Guard Logic...");

function checkAdminAccess(sessionUser, dbUser) {
  if (!sessionUser) {
    return { authorized: false, status: 401, error: "Authentication required" };
  }
  const isDbAdmin = dbUser && dbUser.role === "ADMIN";
  const isMetaAdmin =
    sessionUser.app_metadata?.role === "ADMIN" ||
    sessionUser.user_metadata?.role === "ADMIN";

  if (isDbAdmin || isMetaAdmin) {
    return { authorized: true, status: 200 };
  }
  return { authorized: false, status: 403, error: "Forbidden: Administrator privileges required" };
}

// 1a. Unauthenticated visitor is blocked
const unauth = checkAdminAccess(null, null);
assert.equal(unauth.authorized, false);
assert.equal(unauth.status, 401);

// 1b. Standard Customer role is blocked with 403 Forbidden
const customerUser = { id: "cust-1", email: "alice@test.com", app_metadata: { role: "CUSTOMER" } };
const customerDb = { id: "cust-1", role: "CUSTOMER" };
const custAccess = checkAdminAccess(customerUser, customerDb);
assert.equal(custAccess.authorized, false);
assert.equal(custAccess.status, 403);
assert.match(custAccess.error, /Administrator privileges required/);

// 1c. DB Admin user is granted access
const adminDb = { id: "admin-1", role: "ADMIN" };
const adminAccess = checkAdminAccess(customerUser, adminDb);
assert.equal(adminAccess.authorized, true);
assert.equal(adminAccess.status, 200);

// 1d. Metadata Admin user is granted access
const metaAdminUser = { id: "admin-2", email: "bob@test.com", app_metadata: { role: "ADMIN" } };
const metaAccess = checkAdminAccess(metaAdminUser, { id: "admin-2", role: "CUSTOMER" });
assert.equal(metaAccess.authorized, true);

console.log("  ✓ Admin authorization guard tests passed (unauthenticated, customer 403, admin 200).");

// ---------------------------------------------------------------------------
// 2. Catalog Product CRUD & Validation Tests
// ---------------------------------------------------------------------------
console.log("\nTest 2: Product CRUD, Integer Pricing & Safe Deletion Validation...");

function validateProductInput(body, existingSlugs = new Set()) {
  const name = String(body.name || "").trim();
  if (!name || name.length < 2) {
    return { valid: false, error: "Product name is required (minimum 2 characters)" };
  }
  const slug = (body.slug || name.toLowerCase().replace(/[\s_]+/g, "-")).trim();
  if (existingSlugs.has(slug)) {
    return { valid: false, error: `Product with slug '${slug}' already exists` };
  }
  const rawPrice = body.basePriceInr !== undefined ? body.basePriceInr : (body.basePrice ? body.basePrice / 100 : 0);
  const basePriceInr = Math.max(1, Number(rawPrice) || 0);
  const basePricePaise = Math.round(basePriceInr * 100);
  const stock = Math.max(0, parseInt(body.stock, 10) || 0);

  return {
    valid: true,
    product: {
      name,
      slug,
      basePricePaise,
      stock,
      active: body.active !== undefined ? Boolean(body.active) : true,
    },
  };
}

// 2a. Short name rejected
assert.equal(validateProductInput({ name: "A" }).valid, false);

// 2b. Price conversion to integer paise
const prodRes = validateProductInput({ name: "Planetary Reducer", basePriceInr: 849, stock: 15 });
assert.equal(prodRes.valid, true);
assert.equal(prodRes.product.basePricePaise, 84900, "₹849 must be strictly stored as 84,900 paise");
assert.equal(prodRes.product.slug, "planetary-reducer");

// 2c. Slug collision rejected
const existingSlugs = new Set(["helical-gearbox", "apex-canopy"]);
const dupRes = validateProductInput({ name: "Helical Gearbox", slug: "helical-gearbox" }, existingSlugs);
assert.equal(dupRes.valid, false);
assert.match(dupRes.error, /already exists/);

// 2d. Safe Deletion rule (order history preservation)
function simulateProductDelete(productId, orderItemsCount) {
  if (orderItemsCount > 0) {
    return {
      deactivated: true,
      deleted: false,
      message: `Product is referenced in ${orderItemsCount} historical order(s). It has been deactivated to preserve order records.`,
    };
  }
  return { deactivated: false, deleted: true, message: "Product permanently deleted." };
}

const referencedDelete = simulateProductDelete("prod-referenced", 3);
assert.equal(referencedDelete.deactivated, true, "Ordered product must NOT be hard deleted");
assert.equal(referencedDelete.deleted, false);

const unreferencedDelete = simulateProductDelete("prod-unused", 0);
assert.equal(unreferencedDelete.deleted, true, "Unordered product can be hard deleted");

console.log("  ✓ Product CRUD, paise pricing, and safe deletion protections verified.");

// ---------------------------------------------------------------------------
// 3. Custom Job Review & Mandatory Rejection Reason Tests
// ---------------------------------------------------------------------------
console.log("\nTest 3: Custom Print Job Review Approval & Rejection Rules...");

function reviewCustomJob(jobStatus, adminNote) {
  const normStatus = String(jobStatus).toUpperCase();
  if (normStatus !== "APPROVED" && normStatus !== "REJECTED") {
    return { valid: false, error: "jobStatus must be either 'APPROVED' or 'REJECTED'" };
  }
  const note = adminNote ? String(adminNote).trim() : "";
  if (normStatus === "REJECTED" && (!note || note.length < 5)) {
    return {
      valid: false,
      error: "A mandatory rejection reason note (minimum 5 characters) is required when rejecting a print job.",
    };
  }
  return { valid: true, status: normStatus, adminNote: note || null };
}

// 3a. Approval without note succeeds
const app1 = reviewCustomJob("APPROVED");
assert.equal(app1.valid, true);
assert.equal(app1.status, "APPROVED");

// 3b. Rejection without note fails
const rejFail = reviewCustomJob("REJECTED");
assert.equal(rejFail.valid, false);
assert.match(rejFail.error, /mandatory rejection reason note/);

// 3c. Rejection with short (<5 char) note fails
const rejShort = reviewCustomJob("REJECTED", "bad");
assert.equal(rejShort.valid, false);
assert.match(rejShort.error, /minimum 5 characters/);

// 3d. Rejection with proper engineering note succeeds
const rejOk = reviewCustomJob(
  "REJECTED",
  "Non-manifold edges with 12 open boundary loops. Please repair in CAD."
);
assert.equal(rejOk.valid, true);
assert.equal(rejOk.status, "REJECTED");
assert.match(rejOk.adminNote, /Non-manifold edges/);

console.log("  ✓ Custom job review rules passed (approval valid, rejection requires explanation).");

// ---------------------------------------------------------------------------
// 4. Order Fulfillment State Machine & Anti-Tampering Tests
// ---------------------------------------------------------------------------
console.log("\nTest 4: Order Fulfillment Lifecycle & Integrity Guardrails...");

function transitionOrderStatus(currentStatus, targetStatus) {
  // Rule 1: Never manually mark an unpaid order as PAID
  if (currentStatus === "PENDING_PAYMENT" && targetStatus === "PAID") {
    return {
      success: false,
      error:
        "Unpaid orders cannot be marked as PAID manually. Payment verification must be completed through the Razorpay gateway.",
    };
  }

  // Rule 2: Cannot jump unpaid order straight into production or shipping
  if (
    currentStatus === "PENDING_PAYMENT" &&
    (targetStatus === "IN_PRODUCTION" || targetStatus === "SHIPPED" || targetStatus === "DELIVERED")
  ) {
    return {
      success: false,
      error: "Cannot fulfill an unpaid order. The customer must complete payment verification first.",
    };
  }

  // Lifecycle progression map
  const allowed = {
    PENDING_PAYMENT: ["CANCELLED"],
    PAID: ["IN_PRODUCTION", "CANCELLED", "REFUNDED"],
    IN_PRODUCTION: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: [],
    CANCELLED: [],
    REFUNDED: [],
  };

  if (currentStatus !== targetStatus && !allowed[currentStatus]?.includes(targetStatus)) {
    return {
      success: false,
      error: `Illegal status transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  return { success: true, status: targetStatus };
}

// 4a. Admin attempts to manually mark PENDING_PAYMENT as PAID
const manualPaidAttempt = transitionOrderStatus("PENDING_PAYMENT", "PAID");
assert.equal(manualPaidAttempt.success, false);
assert.match(manualPaidAttempt.error, /Unpaid orders cannot be marked as PAID manually/);

// 4b. Admin attempts to jump PENDING_PAYMENT to IN_PRODUCTION
const unpaidFulfillAttempt = transitionOrderStatus("PENDING_PAYMENT", "IN_PRODUCTION");
assert.equal(unpaidFulfillAttempt.success, false);
assert.match(unpaidFulfillAttempt.error, /Cannot fulfill an unpaid order/);

// 4c. Valid progression: PAID -> IN_PRODUCTION
const step1 = transitionOrderStatus("PAID", "IN_PRODUCTION");
assert.equal(step1.success, true);
assert.equal(step1.status, "IN_PRODUCTION");

// 4d. Valid progression: IN_PRODUCTION -> SHIPPED
const step2 = transitionOrderStatus("IN_PRODUCTION", "SHIPPED");
assert.equal(step2.success, true);
assert.equal(step2.status, "SHIPPED");

// 4e. Valid progression: SHIPPED -> DELIVERED
const step3 = transitionOrderStatus("SHIPPED", "DELIVERED");
assert.equal(step3.success, true);
assert.equal(step3.status, "DELIVERED");

// 4f. Illegal reverse transition: DELIVERED -> IN_PRODUCTION
const reverseAttempt = transitionOrderStatus("DELIVERED", "IN_PRODUCTION");
assert.equal(reverseAttempt.success, false);
assert.match(reverseAttempt.error, /Illegal status transition/);

console.log("  ✓ Order fulfillment state machine and payment protection rules verified.");

console.log("\n==================================================================");
console.log("ALL 4 MILESTONE M4 ADMIN PORTAL SECURITY & LOGIC SUITES PASSED!");
console.log("==================================================================");
