import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw request body as string for HMAC verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header." },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature check (SECURITY.md §4.2)
    const isValid = verifyRazorpayWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      console.warn("Rejected Razorpay webhook with invalid signature.");
      return NextResponse.json(
        { error: "Invalid webhook HMAC signature." },
        { status: 400 }
      );
    }

    // 3. Parse JSON event payload
    const event = JSON.parse(rawBody);
    const eventType = String(event.event || "");

    // We process payment.captured and order.paid
    if (eventType !== "payment.captured" && eventType !== "order.paid") {
      return NextResponse.json({ message: `Ignored event: ${eventType}` }, { status: 200 });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const paymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
    const localOrderId = paymentEntity?.notes?.orderId || event.payload?.order?.entity?.receipt;

    // 4. Locate order in database
    let order = null;
    if (localOrderId) {
      order = await prisma.order.findUnique({
        where: { id: localOrderId },
      });
    }

    if (!order && razorpayOrderId) {
      order = await prisma.order.findFirst({
        where: { paymentRef: razorpayOrderId },
      });
    }

    if (!order) {
      console.warn(`Webhook received for unknown order. localId=${localOrderId}, rzpId=${razorpayOrderId}`);
      // Return 200 to acknowledge webhook delivery even if order isn't matched
      return NextResponse.json({ message: "Order not found; event acknowledged." }, { status: 200 });
    }

    // 5. Idempotent state transition (SECURITY.md §4.2)
    // If order is already PAID, return 200 immediately without duplicate transitions or alerts
    if (order.status === OrderStatus.PAID) {
      return NextResponse.json(
        { message: "Order is already marked as PAID. Duplicate webhook ignored." },
        { status: 200 }
      );
    }

    // 6. Transition order to PAID atomically
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentRef: paymentId || order.paymentRef,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: OrderStatus.PAID,
    });
  } catch (err: unknown) {
    console.error("Payment webhook handling error:", err);
    return NextResponse.json(
      { error: "Internal server error processing webhook." },
      { status: 500 }
    );
  }
}
