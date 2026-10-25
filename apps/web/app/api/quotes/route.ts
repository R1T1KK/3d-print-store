import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateDeterministicQuote } from "@/lib/pricing/calculator";
import { JobStatus, ModelStatus } from "@prisma/client";

/**
 * GET /api/quotes
 * Returns all quotes belonging to the authenticated customer.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quotes = await prisma.quote.findMany({
      where: {
        model: { userId: user.id },
      },
      include: {
        model: {
          select: {
            id: true,
            fileName: true,
            volumeMm3: true,
            sizeXmm: true,
            sizeYmm: true,
            sizeZmm: true,
          },
        },
      },
      orderBy: { expiresAt: "desc" },
    });

    return NextResponse.json({ quotes });
  } catch (err: unknown) {
    console.error("GET /api/quotes error:", err);
    return NextResponse.json({ error: "Failed to retrieve quotes." }, { status: 500 });
  }
}

/**
 * POST /api/quotes
 * Deterministically computes and persists a Quote in PostgreSQL for an analyzed CustomModel.
 * Never trusts client price: recalculates strictly from stored volume metrics.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to generate custom print quote." },
        { status: 401 }
      );
    }

    // 2. Parse request payload
    const body = await request.json().catch(() => null);
    if (!body || !body.modelId) {
      return NextResponse.json(
        { error: "Missing required field: 'modelId'." },
        { status: 400 }
      );
    }

    const modelId = String(body.modelId).trim();
    const material = String(body.material || "PLA").trim();
    const color = String(body.color || "Stealth Black").trim();
    const infillPct = Number(body.infillPct) || 20;
    const layerHeight = Number(body.layerHeight) || 0.20;
    const quantity = Number(body.quantity) || 1;

    // 3. Find model and verify ownership & validity
    const model = await prisma.customModel.findUnique({
      where: { id: modelId },
    });

    const isAdmin =
      user.app_metadata?.role === "ADMIN" || user.user_metadata?.role === "ADMIN";

    if (!model || (!isAdmin && model.userId !== user.id)) {
      return NextResponse.json({ error: "Custom model not found." }, { status: 404 });
    }

    if (model.status !== ModelStatus.VALID || !model.volumeMm3 || model.volumeMm3 <= 0) {
      return NextResponse.json(
        {
          error:
            "Custom model must be analyzed with status VALID before a manufacturing quote can be generated.",
        },
        { status: 400 }
      );
    }

    // 4. Compute deterministic price strictly server-side
    const pricing = calculateDeterministicQuote({
      volumeMm3: model.volumeMm3,
      material,
      infillPct,
      layerHeight,
      quantity,
    });

    // 5. Set default 7-day quote expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 6. Persist Quote in PostgreSQL (initial jobStatus: SUBMITTED for mandatory admin approval)
    const quote = await prisma.quote.create({
      data: {
        modelId: model.id,
        material,
        color,
        infillPct: pricing.effectiveInfillPct,
        layerHeight,
        quantity: Math.max(1, Math.floor(quantity)),
        priceTotal: pricing.totalPricePaise, // in integer paise
        breakdown: {
          ...pricing,
          modelName: model.fileName,
          dimensionsMm: { x: model.sizeXmm, y: model.sizeYmm, z: model.sizeZmm },
        },
        expiresAt,
        jobStatus: JobStatus.SUBMITTED, // Requires admin review before production
      },
    });

    return NextResponse.json({
      quote,
      breakdown: pricing,
    });
  } catch (err: unknown) {
    console.error("POST /api/quotes error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while calculating quote." },
      { status: 500 }
    );
  }
}
