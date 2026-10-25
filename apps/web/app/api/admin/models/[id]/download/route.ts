import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";
import { createSignedReadUrl } from "@/lib/supabase/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const model = await prisma.customModel.findUnique({
      where: { id },
    });

    if (!model) {
      return NextResponse.json({ error: "Model not found." }, { status: 404 });
    }

    // Generate short-lived signed URL (15 minutes = 900 seconds)
    const signedUrl = await createSignedReadUrl(model.fileKey, 900);

    return NextResponse.json({
      signedUrl,
      fileName: model.fileName,
      fileKey: model.fileKey,
      fileSize: model.fileSize,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/models/[id]/download error:", err);
    return NextResponse.json(
      { error: "Failed to generate secure download URL for 3D model." },
      { status: 500 }
    );
  }
}
