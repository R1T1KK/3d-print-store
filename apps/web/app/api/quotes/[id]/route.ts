import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        model: true,
      },
    });

    const isAdmin =
      user.app_metadata?.role === "ADMIN" || user.user_metadata?.role === "ADMIN";

    if (!quote || (!isAdmin && quote.model.userId !== user.id)) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (err: unknown) {
    console.error("GET /api/quotes/[id] error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
