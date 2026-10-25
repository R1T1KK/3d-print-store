import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  isRazorpayConfigured,
  getRazorpayClient,
  verifyRazorpayPaymentSignature,
} from "@/lib/razorpay";
import { OrderStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse verification payload
    const body = await request.json().catch(() => null);
    if (
      !body ||
      !body.orderId ||
      !body.razorpayOrderId ||
      !body.razorpayPaymentId ||
      !body.razorpaySignature
    ) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters." },
        { status: 400 }
      );
    }

    const {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = body;

    // 3. Find order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // If order is already paid (e.g. processed by webhook first or duplicate verification), return success idempotently
    if (order.status === OrderStatus.PAID) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: order.status,
      });
    }

    // 3b. Verify that razorpayOrderId matches the server-created Razorpay order session
    // (Prevents order substitution and cross-order signature replay attacks)
    if (
      order.paymentRef &&
      order.paymentRef.startsWith("order_") &&
      order.paymentRef !== razorpayOrderId
    ) {
      console.error(
        `Razorpay order ID mismatch for order ${orderId}. Expected ${order.paymentRef}, got ${razorpayOrderId}`
      );
      return NextResponse.json(
        { error: "Payment verification failed: Razorpay order identifier mismatch." },
        { status: 400 }
      );
    }

    // 4. Server-Side HMAC Signature Verification (SECURITY.md §4.2)
    const isValid = verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      console.error(
        `Invalid Razorpay payment signature for order ${orderId}, payment ${razorpayPaymentId}`
      );
      return NextResponse.json(
        { error: "Payment verification failed: invalid HMAC signature." },
        { status: 400 }
      );
    }

    // 4b. Gateway-level amount, currency & status verification with Razorpay
    if (isRazorpayConfigured()) {
      try {
        const client = getRazorpayClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payment: any = await client.payments.fetch(razorpayPaymentId);

        // Verify currency
        if (payment.currency && payment.currency !== order.currency) {
          return NextResponse.json(
            { error: "Payment verification failed: currency mismatch." },
            { status: 400 }
          );
        }

        // Verify amount in integer paise
        if (payment.amount !== undefined && Number(payment.amount) !== order.total) {
          return NextResponse.json(
            { error: "Payment verification failed: payment amount mismatch." },
            { status: 400 }
          );
        }

        // Verify payment is captured or authorized
        if (payment.status && payment.status !== "captured" && payment.status !== "authorized") {
          return NextResponse.json(
            { error: `Payment not completed. Status: ${payment.status}` },
            { status: 400 }
          );
        }

        // Verify payment is linked to the expected Razorpay order ID
        if (payment.order_id && payment.order_id !== razorpayOrderId) {
          return NextResponse.json(
            { error: "Payment verification failed: payment is not linked to this order." },
            { status: 400 }
          );
        }
      } catch (gatewayErr: unknown) {
        console.error("Gateway payment check warning:", gatewayErr);
        // In case of transient gateway fetch issues, HMAC signature remains cryptographic authority
      }
    }

    // 5. Atomic state transition: PENDING_PAYMENT -> PAID
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentRef: razorpayPaymentId,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });
  } catch (err: unknown) {
    console.error("POST /api/checkout/verify error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during payment verification." },
      { status: 500 }
    );
  }
}
