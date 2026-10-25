import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        ...order,
        totalInr: Math.round(order.total / 100),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/orders/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || !body.status) {
      return NextResponse.json(
        { error: "Missing required parameter: status." },
        { status: 400 }
      );
    }

    const targetStatus = String(body.status).toUpperCase() as OrderStatus;
    if (!Object.values(OrderStatus).includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid order status '${targetStatus}'.` },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const currentStatus = order.status;

    // Rule 1: Never manually mark an unpaid order as PAID.
    if (currentStatus === OrderStatus.PENDING_PAYMENT && targetStatus === OrderStatus.PAID) {
      return NextResponse.json(
        {
          error:
            "Unpaid orders cannot be marked as PAID manually. Payment verification must be completed through the Razorpay gateway.",
        },
        { status: 400 }
      );
    }

    // Rule 2: Cannot jump unpaid order straight into production or shipping.
    if (
      currentStatus === OrderStatus.PENDING_PAYMENT &&
      (targetStatus === OrderStatus.IN_PRODUCTION ||
        targetStatus === OrderStatus.SHIPPED ||
        targetStatus === OrderStatus.DELIVERED)
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot fulfill an unpaid order. The customer must complete payment verification first.",
        },
        { status: 400 }
      );
    }

    // Rule 3: Valid lifecycle progression checks
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [
        OrderStatus.IN_PRODUCTION,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.IN_PRODUCTION]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
      ],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (currentStatus !== targetStatus && !allowedTransitions[currentStatus]?.includes(targetStatus)) {
      return NextResponse.json(
        {
          error: `Illegal status transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowedTransitions[currentStatus]?.join(", ") || "none"}`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: targetStatus },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: updated.id,
        status: updated.status,
        totalInr: Math.round(updated.total / 100),
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/orders/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update order status." },
      { status: 500 }
    );
  }
}
