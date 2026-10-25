import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSignedReadUrl } from "@/lib/supabase/storage";
import { analyzeMeshViaService } from "@/lib/mesh-client";
import { ModelStatus } from "@prisma/client";

/**
 * GET /api/models
 * Returns all custom 3D models owned by the authenticated customer.
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

    const models = await prisma.customModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        quotes: {
          orderBy: { expiresAt: "desc" },
          take: 5,
        },
      },
    });

    return NextResponse.json({ models });
  } catch (err: unknown) {
    console.error("GET /api/models error:", err);
    return NextResponse.json({ error: "Failed to retrieve models." }, { status: 500 });
  }
}

/**
 * POST /api/models
 * Registers a newly uploaded 3D model, triggers FastAPI mesh geometry analysis,
 * and records the validated model in PostgreSQL.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate customer
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to register custom 3D model." },
        { status: 401 }
      );
    }

    // 2. Ensure Prisma User record exists
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email || "" },
      create: {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || null,
      },
    });

    // 3. Validate request payload
    const body = await request.json().catch(() => null);
    if (!body || !body.fileKey || !body.fileName) {
      return NextResponse.json(
        { error: "Missing required fields: fileKey, fileName." },
        { status: 400 }
      );
    }

    const fileKey = String(body.fileKey).trim();
    const fileName = String(body.fileName).trim();
    const fileSize = Number(body.fileSize) || 0;

    // SECURITY: Enforce that fileKey strictly belongs to this authenticated user
    // models/{userId}/...
    const expectedPrefix = `models/${user.id}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Access denied. Storage key ownership mismatch." },
        { status: 403 }
      );
    }

    // 4. Initial record creation in PENDING state
    const customModel = await prisma.customModel.create({
      data: {
        userId: user.id,
        fileKey,
        fileName,
        fileSize,
        status: ModelStatus.PENDING,
      },
    });

    // 5. Generate short-lived signed read URL for mesh inspection
    let signedReadUrl: string;
    try {
      signedReadUrl = await createSignedReadUrl(fileKey, 900);
    } catch (storageErr: unknown) {
      console.error("Storage signed read URL error:", storageErr);
      await prisma.customModel.update({
        where: { id: customModel.id },
        data: { status: ModelStatus.INVALID },
      });
      return NextResponse.json(
        { error: "Uploaded file could not be read from storage." },
        { status: 400 }
      );
    }

    // 6. Invoke internal FastAPI mesh analysis service
    const analysis = await analyzeMeshViaService(signedReadUrl, fileKey);

    // 7. Update model record with validated geometric metrics
    const finalStatus = analysis.status === "VALID" ? ModelStatus.VALID : ModelStatus.INVALID;
    const updatedModel = await prisma.customModel.update({
      where: { id: customModel.id },
      data: {
        status: finalStatus,
        volumeMm3: analysis.volumeMm3,
        sizeXmm: analysis.sizeXmm,
        sizeYmm: analysis.sizeYmm,
        sizeZmm: analysis.sizeZmm,
        isWatertight: analysis.isWatertight,
        meshReport: {
          ...analysis.meshReport,
          issues: analysis.issues,
        },
      },
    });

    return NextResponse.json({
      model: updatedModel,
      signedViewerUrl: signedReadUrl,
      issues: analysis.issues,
    });
  } catch (err: unknown) {
    console.error("POST /api/models error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while registering the 3D model." },
      { status: 500 }
    );
  }
}
