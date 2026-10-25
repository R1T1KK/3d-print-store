import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { JobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Custom job not found." }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        id: quote.id,
        jobStatus: quote.jobStatus,
        adminNote: quote.adminNote,
        material: quote.material,
        color: quote.color,
        infillPct: quote.infillPct,
        layerHeight: quote.layerHeight,
        quantity: quote.quantity,
        priceTotalPaise: quote.priceTotal,
        priceTotalInr: Math.round(quote.priceTotal / 100),
        breakdown: quote.breakdown,
        expiresAt: quote.expiresAt.toISOString(),
        model: {
          ...quote.model,
          volumeCm3: quote.model.volumeMm3 ? Number((quote.model.volumeMm3 / 1000).toFixed(2)) : null,
          createdAt: quote.model.createdAt.toISOString(),
        },
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/jobs/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch custom job details." },
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
    if (!body || !body.jobStatus) {
      return NextResponse.json(
        { error: "Missing required parameter: jobStatus." },
        { status: 400 }
      );
    }

    const targetStatus = String(body.jobStatus).toUpperCase();
    if (targetStatus !== JobStatus.APPROVED && targetStatus !== JobStatus.REJECTED) {
      return NextResponse.json(
        { error: "jobStatus must be either 'APPROVED' or 'REJECTED'." },
        { status: 400 }
      );
    }

    const note = body.adminNote ? String(body.adminNote).trim() : null;

    // Requirement from SPEC §5.6 & AGENTS.md: Rejection requires mandatory reason note!
    if (targetStatus === JobStatus.REJECTED && (!note || note.length < 5)) {
      return NextResponse.json(
        { error: "A mandatory rejection reason note (minimum 5 characters) is required when rejecting a print job." },
        { status: 400 }
      );
    }

    const existing = await prisma.quote.findUnique({
      where: { id },
      include: { model: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Custom job quote not found." }, { status: 404 });
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        jobStatus: targetStatus as JobStatus,
        adminNote: note,
      },
      include: {
        model: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedQuote.id,
        jobStatus: updatedQuote.jobStatus,
        adminNote: updatedQuote.adminNote,
        priceTotalInr: Math.round(updatedQuote.priceTotal / 100),
        fileName: updatedQuote.model.fileName,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/jobs/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update custom job status." },
      { status: 500 }
    );
  }
}
