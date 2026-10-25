"use client";

import React, { useState, useEffect } from "react";
import { Box, ShoppingCart, Check, Star, Sparkles } from "lucide-react";

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  category: "Mechanical" | "Robotics" | "Drones" | "Desk & Lifestyle";
  price: number;
  rating: number;
  printTime: string;
  materials: string[];
  description: string;
  dimensions: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: "p1",
    slug: "helical-gearbox",
    name: "Dual Helical Planetary Reducer",
    category: "Mechanical",
    price: 849,
    rating: 4.9,
    printTime: "4.5 hrs",
    materials: ["PLA Tough", "PETG"],
    description: "High-torque reduction gearbox designed for robotics actuators and stepper motors.",
    dimensions: "85 × 85 × 42 mm",
  },
  {
    id: "p2",
    slug: "quadcopter-canopy",
    name: "Apex 5-Inch Drone Canopy & Arm Guards",
    category: "Drones",
    price: 599,
    rating: 4.8,
    printTime: "2.8 hrs",
    materials: ["TPU Flexible", "PETG"],
    description: "Aerodynamic FPV camera mount and arm protectors with crash impact absorption.",
    dimensions: "120 × 95 × 30 mm",
  },
  {
    id: "p3",
    slug: "robotic-gripper",
    name: "Adaptive Soft-Robotics Gripper Claw",
    category: "Robotics",
    price: 1190,
    rating: 5.0,
    printTime: "6.2 hrs",
    materials: ["PLA", "PETG"],
    description: "Compliant mechanism gripper suitable for picking delicate and irregular objects.",
    dimensions: "140 × 75 × 60 mm",
  },
  {
    id: "p4",
    slug: "hex-cable-organizer",
    name: "Modular Honeycomb Cable Dock",
    category: "Desk & Lifestyle",
    price: 349,
    rating: 4.7,
    printTime: "1.5 hrs",
    materials: ["PLA"],
    description: "Magnetic desk cable routing hub with clean geometric snap-together hexagons.",
    dimensions: "90 × 80 × 25 mm",
  },
  {
    id: "p5",
    slug: "voronoi-pen-holder",
    name: "Parametric Voronoi Wave Vessel",
    category: "Desk & Lifestyle",
    price: 499,
    rating: 4.9,
    printTime: "3.5 hrs",
    materials: ["Silk PLA", "PETG"],
    description: "Generative organic lattice structure, lightweight yet rigid display vessel.",
    dimensions: "95 × 95 × 115 mm",
  },
  {
    id: "p6",
    slug: "stepper-nema17-dampener",
    name: "NEMA 17 Anti-Vibration Mounts (Set of 3)",
    category: "Mechanical",
    price: 299,
    rating: 4.8,
    printTime: "1.2 hrs",
    materials: ["PETG"],
    description: "Precision CNC and 3D printer motor dampener isolating resonance and noise.",
    dimensions: "42 × 42 × 10 mm",
  },
];

interface ProductGridProps {
  onAddToCart: (product: CatalogProduct) => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [products, setProducts] = useState<CatalogProduct[]>(CATALOG_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let ignore = false;

    async function fetchLiveProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && Array.isArray(data.products) && data.products.length > 0) {
            setProducts(data.products);
          }
        }
      } catch (err) {
        console.warn("Could not fetch live products from database, using fallback:", err);
      }
    }

    fetchLiveProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const categories = ["All", "Mechanical", "Robotics", "Drones", "Desk & Lifestyle"];

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleAdd = (product: CatalogProduct) => {
    onAddToCart(product);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  return (
    <div className="w-full">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-white text-black shadow-[0_4px_18px_rgba(0,0,0,0.25)] font-semibold"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 backdrop-blur-md"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-white/40 font-mono">
          Showing {filteredProducts.length} verified designs
        </span>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const isJustAdded = addedIds[product.id];

          return (
            <div
              key={product.id}
              className="group relative bg-[#0a0a0a]/80 border border-white/10 hover:border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.10)] backdrop-blur-md"
            >
              <div>
                {/* Visual Canvas / 3D Badge */}
                <div className="relative w-full h-48 rounded-2xl bg-[#0e0e0e] flex flex-col items-center justify-center border border-white/10 overflow-hidden group-hover:border-white/20 transition-all">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_70%)]" />
                  <Box className="w-12 h-12 text-white/40 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300" />
                  <span className="text-[11px] font-mono text-white/40 mt-3">
                    {product.dimensions}
                  </span>

                  {/* 3D Interactive Badge */}
                  <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-[10px] text-white/80 font-mono backdrop-blur-md">
                    <Sparkles className="w-3 h-3 text-emerald-400" /> 3D Preview
                  </div>

                  <div className="absolute bottom-3.5 left-3.5 text-[10px] font-mono text-white/50">
                    Print: {product.printTime}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-emerald-300">
                      {product.category}
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-semibold text-xs">
                      <Star className="w-3 h-3 fill-amber-300" /> {product.rating}
                    </span>
                  </div>

                  <h4 className="text-[17px] font-semibold text-white mt-2.5 group-hover:text-emerald-300 transition-colors font-heading tracking-tight">
                    {product.name}
                  </h4>
                  <p className="text-xs text-white/50 mt-1.5 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Materials */}
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {product.materials.map((mat) => (
                      <span
                        key={mat}
                        className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                      >
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Add to Cart */}
              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Ready to Print</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">
                    ₹{product.price.toLocaleString("en-IN")}
                  </div>
                </div>

                <button
                  onClick={() => handleAdd(product)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    isJustAdded
                      ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                      : "bg-white text-black hover:bg-white/90 hover:scale-[1.02]"
                  }`}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Added
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

