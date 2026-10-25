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

export async function GET(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const activeParam = searchParams.get("active");
    const material = searchParams.get("material")?.trim() || "";

    // Build Prisma where query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (activeParam === "true") {
      where.active = true;
    } else if (activeParam === "false") {
      where.active = false;
    }

    if (material) {
      where.materials = { has: material };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        basePriceInr: Math.round(p.basePrice / 100),
      })),
      total: products.length,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/products error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse } = await requireAdminApi();
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const name = String(body.name || "").trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Product name is required (minimum 2 characters)." },
        { status: 400 }
      );
    }

    const rawSlug = body.slug ? String(body.slug).trim() : slugify(name);
    const slug = slugify(rawSlug);
    if (!slug) {
      return NextResponse.json(
        { error: "Valid product slug is required." },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Product with slug '${slug}' already exists.` },
        { status: 409 }
      );
    }

    const description = String(body.description || "").trim();
    const rawPrice = body.basePriceInr !== undefined ? body.basePriceInr : (body.basePrice ? body.basePrice / 100 : 0);
    const basePriceInr = Math.max(1, Number(rawPrice) || 0);
    const basePricePaise = Math.round(basePriceInr * 100);

    const stock = Math.max(0, parseInt(body.stock, 10) || 0);
    const materials = Array.isArray(body.materials)
      ? body.materials.map((m: string) => String(m).trim()).filter(Boolean)
      : ["PLA"];
    const images = Array.isArray(body.images)
      ? body.images.map((img: string) => String(img).trim()).filter(Boolean)
      : [];
    const modelUrl = body.modelUrl ? String(body.modelUrl).trim() : null;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        basePrice: basePricePaise,
        currency: "INR",
        stock,
        materials,
        images,
        modelUrl,
        active,
      },
    });

    return NextResponse.json({
      product: {
        ...product,
        basePriceInr: Math.round(product.basePrice / 100),
      },
    }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/admin/products error:", err);
    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 }
    );
  }
}
