"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InstantQuoteCalculator from "@/components/custom/InstantQuoteCalculator";
import ProductGrid, { CatalogProduct } from "@/components/catalog/ProductGrid";
import CartDrawer, { CartItem } from "@/components/cart/CartDrawer";
import {
  UploadCloud,
  Layers,
  Zap,
  ShieldCheck,
  Sparkles,
  Printer,
  Sliders,
  CheckCircle,
} from "lucide-react";
import { parse3DModelFile, ParsedModelResult } from "@/lib/model-parser";

// Dynamic client-only import for Three.js WebGL canvas to prevent SSR hydration errors
const ThreeViewer = dynamic(() => import("@/components/viewer/ThreeViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[580px] lg:h-[680px] rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-zinc-500">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-mono">Initializing Three.js WebGL Engine...</span>
    </div>
  ),
});

export default function Home() {
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: "demo-item-1",
      productId: "test-print-1",
      title: "Razorpay ₹1 Test Verification Print",
      subtitle: "Material: PLA Tough • Instant Gateway Test Token",
      price: 1,
      quantity: 1,
      material: "PLA Tough",
      type: "catalog",
    },
  ]);

  // Load persisted cart on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("fabric3d_cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const hasTestItem = parsed.some(
              (item: CartItem) => item.productId === "test-print-1" || item.price === 1
            );
            if (!hasTestItem) {
              parsed.unshift({
                id: "demo-item-1",
                productId: "test-print-1",
                title: "Razorpay ₹1 Test Verification Print",
                subtitle: "Material: PLA Tough • Instant Gateway Test Token",
                price: 1,
                quantity: 1,
                material: "PLA Tough",
                type: "catalog",
              });
            }
            setCartItems(parsed);
            return;
          }
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save cart changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("fabric3d_cart", JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // Synchronized 3D Model State across Simulator & Custom Quote Calculator
  const [activeModel, setActiveModel] = useState<ParsedModelResult | null>(null);
  const [serverModelId, setServerModelId] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const viewerSectionRef = useRef<HTMLDivElement>(null);
  const quoteSectionRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Unified File Upload Handler for STL, OBJ, and 3MF
  const handleModelFileUpload = useCallback(async (file: File) => {
    setModelLoading(true);
    setModelError(null);

    try {
      const parsed = await parse3DModelFile(file);
      setActiveModel(parsed);
      // Smoothly bring the 3D viewer into view so the user immediately sees their model on the bed
      if (viewerSectionRef.current) {
        viewerSectionRef.current.scrollIntoView({ behavior: "smooth" });
      }

      // Background persistence to private Supabase storage and server mesh analyzer
      (async () => {
        try {
          const signRes = await fetch("/api/uploads/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || "application/octet-stream",
            }),
          });
          if (!signRes.ok) return;

          const { signedUploadUrl, fileKey } = await signRes.json();
          const uploadRes = await fetch(signedUploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type || "application/octet-stream",
            },
          });
          if (!uploadRes.ok) return;

          const modelRes = await fetch("/api/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileKey,
              fileName: file.name,
              fileSize: file.size,
            }),
          });
          if (modelRes.ok) {
            const { model } = await modelRes.json();
            setServerModelId(model.id);
          }
        } catch (uploadErr) {
          console.warn("Storage upload notice:", uploadErr);
        }
      })();
    } catch (err: unknown) {
      console.error("Error parsing 3D file:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to parse 3D model. Please verify file integrity.";
      setModelError(msg);
      setActiveModel(null);
    } finally {
      setModelLoading(false);
    }
  }, []);

  const handleClearCustomModel = useCallback(() => {
    setActiveModel(null);
    setServerModelId(null);
    setModelError(null);
  }, []);

  const handleAddCatalogProduct = (product: CatalogProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          title: product.name,
          subtitle: `Material: ${product.materials[0]}`,
          price: product.price,
          quantity: 1,
          material: product.materials[0],
          type: "catalog",
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleAddCustomQuote = async (customItem: {
    id: string;
    title: string;
    material: string;
    color: string;
    infill: number;
    layerHeight: string;
    quantity: number;
    price: number;
    volumeCm3: number;
  }) => {
    let persistentQuoteId: string | undefined = undefined;
    let finalUnitPrice = customItem.price / customItem.quantity;

    // If server model is registered, calculate and persist deterministic quote in database
    if (serverModelId) {
      try {
        const quoteRes = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: serverModelId,
            material: customItem.material,
            color: customItem.color,
            infillPct: customItem.infill,
            layerHeight: parseFloat(customItem.layerHeight),
            quantity: customItem.quantity,
          }),
        });
        if (quoteRes.ok) {
          const { quote, breakdown } = await quoteRes.json();
          persistentQuoteId = quote.id;
          finalUnitPrice = breakdown.unitPriceInr;
        }
      } catch (err) {
        console.warn("Server quote creation notice:", err);
      }
    }

    setCartItems((prev) => [
      ...prev,
      {
        id: customItem.id,
        quoteId: persistentQuoteId,
        title: customItem.title,
        subtitle: `${customItem.material} (${customItem.color}) • ${customItem.infill}% Infill • ${customItem.layerHeight}`,
        price: finalUnitPrice,
        quantity: customItem.quantity,
        material: customItem.material,
        type: "custom",
      },
    ]);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    try {
      localStorage.setItem("fabric3d_cart", JSON.stringify(cartItems));
    } catch {
      // ignore
    }
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Navigation */}
      <Navbar
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onScrollToQuote={() => scrollTo(quoteSectionRef)}
        onScrollToCatalog={() => scrollTo(catalogSectionRef)}
        onScrollToViewer={() => scrollTo(viewerSectionRef)}
      />

      <main className="flex-1 w-full flex flex-col">
        {/* HERO SECTION (AURORA CINEMATIC STYLE) */}
        <section className="relative w-full min-h-[96vh] flex flex-col justify-between overflow-hidden pt-28 sm:pt-32 pb-12 px-6 sm:px-12 lg:px-16">
          {/* Background Video */}
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/hero.mp4"
            autoPlay
            muted
            loop
            playsInline
          />

          {/* Aurora Gradient Overlays */}
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#050505] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 pointer-events-none" />
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1100px] h-[750px] bg-[radial-gradient(ellipse_at_50%_30%,rgba(6,95,70,0.28)_0%,transparent_70%)] pointer-events-none" />

          {/* Top-Left / Bottom-Left Content Anchor */}
          <div className="relative z-10 max-w-3xl mt-8 sm:mt-12">
            {/* Trusted By Pill Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 bg-white/[0.08] border border-white/20 backdrop-blur-md shadow-lg">
              <div className="flex">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 border-2 border-[#0a1410] -ml-2 first:ml-0"
                  />
                ))}
              </div>
              <span className="text-xs text-white/80 font-sans">
                Trusted by <strong className="text-white font-semibold">1,200+ engineers</strong> across India
              </span>
              <span className="text-white/30 hidden sm:inline">•</span>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold hidden sm:inline">
                ₹2.20 / g Tough PLA
              </span>
            </div>

            {/* Cinematic Headline */}
            <h1 className="font-heading font-medium text-4xl sm:text-6xl lg:text-[4.3rem] leading-[1.06] tracking-[-0.02em] text-white mt-6">
              Precision That<br />
              Lights the Way
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-sm sm:text-base text-white/65 max-w-lg leading-relaxed font-sans">
              FABRIC3D empowers engineering teams & creators to transform raw 3D mesh files into production reality with instant geometric validation and 48-hour delivery.
            </p>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-3.5 mt-8">
              <button
                onClick={() => scrollTo(quoteSectionRef)}
                className="px-7 py-3.5 rounded-full bg-[#0a0a0a] hover:bg-black text-white text-xs sm:text-sm font-semibold border border-white/20 hover:border-emerald-500/50 transition-all shadow-xl hover:scale-[1.02] cursor-pointer"
              >
                Get Instant Quote
              </button>

              <button
                onClick={() => scrollTo(viewerSectionRef)}
                aria-label="Inspect 3D Simulator"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 cursor-pointer text-white"
                title="Inspect 3D Simulator"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => scrollTo(catalogSectionRef)}
                className="px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs sm:text-sm font-medium border border-white/10 backdrop-blur-md transition-all cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          </div>

          {/* Bottom Row: Quality Pillars & Social Badges */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pt-16">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs text-white/60">
              <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>48h Fast Dispatch</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Watertight Mesh QA</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>0.12mm Resolution</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Setup Hassle</span>
              </div>
            </div>

            {/* Pinned Social Icons */}
            <div className="flex items-center gap-2.5">
              {[
                { label: "X", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { label: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.554V9h3.565v11.452z" },
                { label: "Instagram", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:border-white/40 transition-all cursor-pointer backdrop-blur-md"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CONTAINER FOR CONTENT SECTIONS */}
        <div className="max-w-7xl w-full mx-auto px-6 sm:px-10 space-y-24 sm:space-y-32">
          {/* SECTION 1: 3D INTERACTIVE WEBGL STAGE */}
          <section ref={viewerSectionRef} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                  Precision Simulator
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 font-heading">
                  Real-Time 3D Printer Bed Simulator
                </h2>
              </div>
              <p className="text-xs text-white/50 max-w-md font-sans">
                Drag to rotate 360°, scroll to zoom, switch materials, or toggle wireframe to inspect layer geometry on a 220×220mm build bed.
              </p>
            </div>

            <ThreeViewer
              activeModel={activeModel}
              isLoading={modelLoading}
              loadError={modelError}
              onClearCustomModel={handleClearCustomModel}
              onTriggerUploadClick={() => scrollTo(quoteSectionRef)}
            />
          </section>

          {/* SECTION 2: INSTANT QUOTE & CUSTOM STL/OBJ/3MF UPLOAD */}
          <section ref={quoteSectionRef} className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                Automated Slicing & Quoting
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                Upload Your Own STL, OBJ, or 3MF
              </h2>
              <p className="text-xs sm:text-sm text-white/50 font-sans">
                Calculate machine print time, material mass, and final cost in INR immediately before ordering.
              </p>
            </div>

            <InstantQuoteCalculator
              activeModel={activeModel}
              isLoading={modelLoading}
              loadError={modelError}
              onFileUpload={handleModelFileUpload}
              onClearFile={handleClearCustomModel}
              onAddToCart={handleAddCustomQuote}
            />
          </section>

          {/* SECTION 3: READY-TO-PRINT 3D CATALOG */}
          <section ref={catalogSectionRef} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                  Pre-Calibrated Geometry
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 font-heading">
                  Ready-to-Print 3D Catalog
                </h2>
              </div>
              <p className="text-xs text-white/50 max-w-md font-sans">
                Choose from pre-calibrated engineering components, robotics brackets, and lifestyle products optimized for maximum layer strength.
              </p>
            </div>

            <ProductGrid onAddToCart={handleAddCatalogProduct} />
          </section>

          {/* SECTION 4: 4-STEP MANUFACTURING PIPELINE */}
          <section className="p-8 sm:p-14 rounded-3xl bg-[#090909] border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-emerald-950/20 rounded-full blur-[140px] pointer-events-none" />

            <div className="text-center max-w-lg mx-auto mb-12 relative z-10">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-heading">
                The 4-Step Manufacturing Pipeline
              </h3>
              <p className="text-xs text-white/50 mt-1.5 font-sans">
                From raw polygon mesh to industrial finished part at your doorstep.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {[
                {
                  step: "01",
                  title: "Upload & Verify",
                  desc: "Drop your STL, OBJ, or 3MF. Our client and backend mesh workers inspect watertight topology and volume instantly.",
                  icon: UploadCloud,
                },
                {
                  step: "02",
                  title: "Material & Infill",
                  desc: "Configure PLA, PETG or Resin with custom infill % (15% to 100%) and layer heights down to 0.12mm.",
                  icon: Sliders,
                },
                {
                  step: "03",
                  title: "Precision Print",
                  desc: "Manufactured on calibrated high-temp 3D printers with real-time temperature control and strict tolerances.",
                  icon: Printer,
                },
                {
                  step: "04",
                  title: "Express Delivery",
                  desc: "Post-processed, quality-checked, and shipped with secure shock-proof packaging across India in 48h.",
                  icon: CheckCircle,
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    className="p-6 rounded-2xl bg-[#0f0f0f] border border-white/10 space-y-3 hover:border-emerald-500/30 transition-all backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-2xl font-bold text-emerald-500/40">
                        {s.step}
                      </span>
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-white font-heading">{s.title}</h4>
                    <p className="text-xs text-white/50 leading-relaxed font-sans">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

