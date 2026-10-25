import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createSignedReadUrl } from "@/lib/supabase/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const model = await prisma.customModel.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: { expiresAt: "desc" },
        },
      },
    });

    // Enforce ownership isolation (SECURITY.md §1.2)
    const isAdmin =
      user.app_metadata?.role === "ADMIN" || user.user_metadata?.role === "ADMIN";

    if (!model || (!isAdmin && model.userId !== user.id)) {
      return NextResponse.json({ error: "Model not found." }, { status: 404 });
    }

    // Generate fresh signed URL for Three.js viewer
    let signedViewerUrl: string | null = null;
    try {
      signedViewerUrl = await createSignedReadUrl(model.fileKey, 900);
    } catch {
      // Storage access could fail if file was deleted
    }

    return NextResponse.json({
      model,
      signedViewerUrl,
    });
  } catch (err: unknown) {
    console.error("GET /api/models/[id] error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
