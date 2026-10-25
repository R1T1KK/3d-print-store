import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { JobStatus } from "@prisma/client";

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

    if (statusParam && Object.values(JobStatus).includes(statusParam as JobStatus)) {
      where.jobStatus = statusParam as JobStatus;
    }

    if (search) {
      where.OR = [
        { model: { fileName: { contains: search, mode: "insensitive" } } },
        { model: { user: { email: { contains: search, mode: "insensitive" } } } },
        { model: { user: { name: { contains: search, mode: "insensitive" } } } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { model: { createdAt: "desc" } },
      include: {
        model: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      jobs: quotes.map((q) => ({
        id: q.id,
        jobStatus: q.jobStatus,
        adminNote: q.adminNote,
        material: q.material,
        color: q.color,
        infillPct: q.infillPct,
        layerHeight: q.layerHeight,
        quantity: q.quantity,
        priceTotalPaise: q.priceTotal,
        priceTotalInr: Math.round(q.priceTotal / 100),
        breakdown: q.breakdown,
        expiresAt: q.expiresAt.toISOString(),
        model: {
          id: q.model.id,
          fileName: q.model.fileName,
          fileSize: q.model.fileSize,
          fileKey: q.model.fileKey,
          status: q.model.status,
          volumeMm3: q.model.volumeMm3,
          volumeCm3: q.model.volumeMm3 ? Number((q.model.volumeMm3 / 1000).toFixed(2)) : null,
          sizeXmm: q.model.sizeXmm,
          sizeYmm: q.model.sizeYmm,
          sizeZmm: q.model.sizeZmm,
          isWatertight: q.model.isWatertight,
          meshReport: q.model.meshReport,
          createdAt: q.model.createdAt.toISOString(),
          customer: {
            id: q.model.user?.id,
            email: q.model.user?.email || "Anonymous",
            name: q.model.user?.name || "Customer",
          },
        },
      })),
      total: quotes.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/jobs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch custom job queue." },
      { status: 500 }
    );
  }
}
