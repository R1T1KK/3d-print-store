import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status")?.toUpperCase();
    const search = searchParams.get("search")?.trim().toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
      where.status = statusParam as OrderStatus;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { paymentRef: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        items: true,
      },
    });

    // Populate catalog product details and custom quote details for items
    const productIds = Array.from(new Set(orders.flatMap((o) => o.items.map((i) => i.productId).filter(Boolean)))) as string[];
    const quoteIds = Array.from(new Set(orders.flatMap((o) => o.items.map((i) => i.quoteId).filter(Boolean)))) as string[];

    const [products, quotes] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, slug: true, images: true },
      }),
      prisma.quote.findMany({
        where: { id: { in: quoteIds } },
        include: { model: { select: { fileName: true } } },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const quoteMap = new Map(quotes.map((q) => [q.id, q]));

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        totalPaise: o.total,
        totalInr: Math.round(o.total / 100),
        currency: o.currency,
        paymentRef: o.paymentRef,
        address: o.addressJson,
        customer: {
          id: o.user?.id,
          email: o.user?.email || "Guest",
          name: o.user?.name || "Customer",
        },
        items: o.items.map((item) => {
          const prod = item.productId ? productMap.get(item.productId) : null;
          const quote = item.quoteId ? quoteMap.get(item.quoteId) : null;
          return {
            id: item.id,
            productId: item.productId,
            quoteId: item.quoteId,
            quantity: item.quantity,
            unitPricePaise: item.unitPrice,
            unitPriceInr: Math.round(item.unitPrice / 100),
            title: prod
              ? prod.name
              : quote
              ? `Custom 3D: ${quote.model.fileName} (${quote.material})`
              : "Store Item",
          };
        }),
      })),
      total: orders.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
