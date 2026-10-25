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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    const isAdmin =
      user.app_metadata?.role === "ADMIN" || user.user_metadata?.role === "ADMIN";

    if (!order || (!isAdmin && order.userId !== user.id)) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: unknown) {
    console.error("GET /api/orders/[id] error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
