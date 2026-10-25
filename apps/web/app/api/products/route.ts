import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ProductMeta {
  category: "Mechanical" | "Robotics" | "Drones" | "Desk & Lifestyle";
  rating: number;
  printTime: string;
  dimensions: string;
}

const PRODUCT_METADATA_MAP: Record<string, ProductMeta> = {
  "helical-gearbox": {
    category: "Mechanical",
    rating: 4.9,
    printTime: "4.5 hrs",
    dimensions: "85 × 85 × 42 mm",
  },
  "quadcopter-canopy": {
    category: "Drones",
    rating: 4.8,
    printTime: "2.8 hrs",
    dimensions: "120 × 95 × 30 mm",
  },
  "robotic-gripper": {
    category: "Robotics",
    rating: 5.0,
    printTime: "6.2 hrs",
    dimensions: "140 × 75 × 60 mm",
  },
  "hex-cable-organizer": {
    category: "Desk & Lifestyle",
    rating: 4.7,
    printTime: "1.5 hrs",
    dimensions: "90 × 80 × 25 mm",
  },
  "voronoi-pen-holder": {
    category: "Desk & Lifestyle",
    rating: 4.9,
    printTime: "3.5 hrs",
    dimensions: "95 × 95 × 115 mm",
  },
  "stepper-nema17-dampener": {
    category: "Mechanical",
    rating: 4.8,
    printTime: "1.2 hrs",
    dimensions: "42 × 42 × 10 mm",
  },
  "biomimetic-bracket": {
    category: "Mechanical",
    rating: 4.9,
    printTime: "3.8 hrs",
    dimensions: "110 × 65 × 45 mm",
  },
};

export async function GET() {
  try {
    const dbProducts = await prisma.product.findMany({
      where: {
        active: true,
        // Exclude internal test tokens from public storefront catalog
        NOT: {
          slug: { in: ["razorpay-1-rupee-test", "test-print-1"] },
        },
      },
      orderBy: { name: "asc" },
    });

    const products = dbProducts.map((p) => {
      const meta = PRODUCT_METADATA_MAP[p.slug] || {
        category: "Mechanical",
        rating: 4.8,
        printTime: "3.0 hrs",
        dimensions: "100 × 100 × 50 mm",
      };

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: meta.category,
        price: Math.round(p.basePrice / 100), // Converted from integer paise to INR
        pricePaise: p.basePrice,
        rating: meta.rating,
        printTime: meta.printTime,
        materials: p.materials.length > 0 ? p.materials : ["PLA", "PETG"],
        description: p.description,
        dimensions: meta.dimensions,
        stock: p.stock,
      };
    });

    return NextResponse.json({ products });
  } catch (err: unknown) {
    console.error("GET /api/products error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products from database" },
      { status: 500 }
    );
  }
}
