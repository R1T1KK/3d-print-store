import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { OrderStatus, JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    // 1. Paid revenue calculation
    const revenueAgg = await prisma.order.aggregate({
      where: {
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.IN_PRODUCTION,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
      },
      _sum: { total: true },
    });

    const totalRevenuePaise = revenueAgg._sum.total || 0;

    // 2. Orders breakdown
    const [
      totalOrders,
      pendingPaymentOrders,
      paidOrders,
      inProductionOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING_PAYMENT } }),
      prisma.order.count({ where: { status: OrderStatus.PAID } }),
      prisma.order.count({ where: { status: OrderStatus.IN_PRODUCTION } }),
      prisma.order.count({ where: { status: OrderStatus.SHIPPED } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

    // 3. Custom jobs breakdown
    const [
      submittedJobs,
      approvedJobs,
      rejectedJobs,
      totalQuotes,
    ] = await Promise.all([
      prisma.quote.count({ where: { jobStatus: JobStatus.SUBMITTED } }),
      prisma.quote.count({ where: { jobStatus: JobStatus.APPROVED } }),
      prisma.quote.count({ where: { jobStatus: JobStatus.REJECTED } }),
      prisma.quote.count(),
    ]);

    // 4. Products breakdown
    const [totalProducts, activeProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
    ]);

    // 5. Recent orders (last 5)
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { email: true, name: true } },
        items: true,
      },
    });

    // 6. Recent submitted quotes (last 5)
    const recentJobs = await prisma.quote.findMany({
      where: { jobStatus: JobStatus.SUBMITTED },
      orderBy: { model: { createdAt: "desc" } },
      take: 5,
      include: {
        model: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      metrics: {
        totalRevenuePaise,
        totalRevenueInr: Math.round(totalRevenuePaise / 100),
        orders: {
          total: totalOrders,
          pendingPayment: pendingPaymentOrders,
          paid: paidOrders,
          inProduction: inProductionOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
          activeFulfillment: paidOrders + inProductionOrders + shippedOrders,
        },
        jobs: {
          submitted: submittedJobs,
          approved: approvedJobs,
          rejected: rejectedJobs,
          total: totalQuotes,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        totalPaise: o.total,
        totalInr: Math.round(o.total / 100),
        status: o.status,
        customerEmail: o.user?.email || "Guest",
        customerName: o.user?.name || "Customer",
        itemsCount: o.items.length,
      })),
      recentJobs: recentJobs.map((q) => ({
        id: q.id,
        createdAt: q.model.createdAt.toISOString(),
        fileName: q.model.fileName,
        material: q.material,
        color: q.color,
        pricePaise: q.priceTotal,
        priceInr: Math.round(q.priceTotal / 100),
        status: q.jobStatus,
        customerEmail: q.model.user?.email || "Anonymous",
        volumeMm3: q.model.volumeMm3,
        isWatertight: q.model.isWatertight,
      })),
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/metrics error:", err);
    return NextResponse.json(
      { error: "Failed to load admin metrics." },
      { status: 500 }
    );
  }
}
