import { Pool } from "pg";

process.loadEnvFile(".env.local");

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
const pool = new Pool({ connectionString });

async function main() {
  console.log("=== FABRIC3D LIVE PURCHASE / ORDER DATABASE ===\n");

  const ordersQuery = `
    SELECT 
      o.id,
      o."createdAt",
      o.status,
      o.total,
      o.currency,
      o."paymentRef",
      o."addressJson",
      u.email AS "customerEmail",
      u.name AS "customerName"
    FROM "Order" o
    LEFT JOIN "User" u ON o."userId" = u.id
    ORDER BY o."createdAt" DESC;
  `;

  const ordersRes = await pool.query(ordersQuery);

  if (ordersRes.rows.length === 0) {
    console.log("No orders found in database.");
    await pool.end();
    return;
  }

  console.log(`Total Orders in Database: ${ordersRes.rows.length}\n`);

  for (const order of ordersRes.rows) {
    const itemsRes = await pool.query(
      `SELECT oi.id, oi.quantity, oi."unitPrice", p.name AS "productName", oi."quoteId"
       FROM "OrderItem" oi
       LEFT JOIN "Product" p ON oi."productId" = p.id
       WHERE oi."orderId" = $1`,
      [order.id]
    );

    const addr = order.addressJson || {};

    console.log("================================================================================");
    console.log(`ORDER ID:        ${order.id}`);
    console.log(`Created At:      ${new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
    console.log(`Order Status:    ${order.status}`);
    console.log(`Total Amount:    ₹${(order.total / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${order.currency}`);
    console.log(`Payment Ref:     ${order.paymentRef || "Awaiting Payment"}`);
    console.log(`Customer:        ${order.customerName || "N/A"} (${order.customerEmail})`);
    console.log(`Shipping To:     ${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city || ""}, ${addr.state || ""} - ${addr.postalCode || ""}`);
    console.log(`Contact Phone:   ${addr.phone || "N/A"}`);
    console.log("Purchased Items:");
    for (const item of itemsRes.rows) {
      const name = item.productName || (item.quoteId ? `Custom 3D Print (Quote ID: ${item.quoteId})` : "Custom Item");
      const subtotal = (item.unitPrice * item.quantity) / 100;
      console.log(`  • ${name}`);
      console.log(`    Qty: ${item.quantity} | Unit: ₹${(item.unitPrice / 100).toFixed(2)} | Subtotal: ₹${subtotal.toFixed(2)}`);
    }
  }

  console.log("================================================================================\n");
  await pool.end();
}

main().catch((err) => {
  console.error("Database query error:", err);
  process.exit(1);
});
