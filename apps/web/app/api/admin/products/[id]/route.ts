import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        basePriceInr: Math.round(product.basePrice / 100),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/products/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch product." },
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
    if (!body) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToUpdate: any = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
      }
      dataToUpdate.name = name;
    }

    if (body.slug !== undefined) {
      const slug = slugify(String(body.slug).trim());
      if (slug && slug !== existing.slug) {
        const conflict = await prisma.product.findUnique({ where: { slug } });
        if (conflict) {
          return NextResponse.json({ error: `Slug '${slug}' is already taken.` }, { status: 409 });
        }
        dataToUpdate.slug = slug;
      }
    }

    if (body.description !== undefined) {
      dataToUpdate.description = String(body.description).trim();
    }

    if (body.basePriceInr !== undefined || body.basePrice !== undefined) {
      const rawPrice = body.basePriceInr !== undefined ? body.basePriceInr : (body.basePrice ? body.basePrice / 100 : 0);
      const inr = Math.max(1, Number(rawPrice) || 0);
      dataToUpdate.basePrice = Math.round(inr * 100);
    }

    if (body.stock !== undefined) {
      dataToUpdate.stock = Math.max(0, parseInt(body.stock, 10) || 0);
    }

    if (body.active !== undefined) {
      dataToUpdate.active = Boolean(body.active);
    }

    if (body.materials !== undefined && Array.isArray(body.materials)) {
      dataToUpdate.materials = body.materials.map((m: string) => String(m).trim()).filter(Boolean);
    }

    if (body.images !== undefined && Array.isArray(body.images)) {
      dataToUpdate.images = body.images.map((img: string) => String(img).trim()).filter(Boolean);
    }

    if (body.modelUrl !== undefined) {
      dataToUpdate.modelUrl = body.modelUrl ? String(body.modelUrl).trim() : null;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      product: {
        ...updated,
        basePriceInr: Math.round(updated.basePrice / 100),
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/products/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    // Safe deletion: check if referenced in any OrderItem
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (orderItemCount > 0) {
      // Soft-delete to preserve order history
      const deactivated = await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        message: `Product is referenced in ${orderItemCount} historical order(s). It has been deactivated to preserve order records.`,
        deactivated: true,
        product: deactivated,
      });
    }

    // Hard-delete if not referenced in any orders
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({
      message: "Product permanently deleted.",
      deactivated: false,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/products/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete product." },
      { status: 500 }
    );
  }
}
