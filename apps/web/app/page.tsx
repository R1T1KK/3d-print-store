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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navigation */}
      <Navbar
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onScrollToQuote={() => scrollTo(quoteSectionRef)}
        onScrollToCatalog={() => scrollTo(catalogSectionRef)}
        onScrollToViewer={() => scrollTo(viewerSectionRef)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-20 lg:space-y-28 pt-8 lg:pt-14">
        {/* HERO SECTION */}
        <section className="relative text-center max-w-4xl mx-auto space-y-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Industrial-Grade 3D Manufacturing in India</span>
            <span className="text-zinc-600">•</span>
            <span className="text-cyan-400 font-mono">₹2.20 / g PLA</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Turn Your 3D Models into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
              Precision Physical Reality
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Instant geometry analysis, deterministic live pricing in ₹ INR, and commercial-grade
            FDM / Resin additive manufacturing with 48-hour delivery across India.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => scrollTo(quoteSectionRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-500/25 hover:scale-[1.02]"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Get Instant 3D Quote</span>
            </button>

            <button
              onClick={() => scrollTo(viewerSectionRef)}
              className="w-full sm:w-auto px-7 py-4 rounded-xl font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 flex items-center justify-center gap-2 transition-all hover:border-zinc-700"
            >
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Inspect 3D Stage</span>
            </button>
          </div>

          {/* Trust Value Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 text-xs text-zinc-400">
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>48h Fast Dispatch</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Watertight Mesh QA</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              <span>0.12mm Resolution</span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Zero Setup Hassle</span>
            </div>
          </div>
        </section>

        {/* SECTION 1: 3D INTERACTIVE WEBGL STAGE */}
        <section ref={viewerSectionRef} className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                Milestone M1 & M2 Synchronized Simulator
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Real-Time 3D Printer Bed Simulator
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-md">
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
        <section ref={quoteSectionRef} className="space-y-5">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
              Automated Quoting Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Upload Your Own STL, OBJ, or 3MF
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
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
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                Precision Tested Designs
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Ready-to-Print 3D Catalog
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-md">
              Choose from pre-calibrated engineering components, robotics brackets, and lifestyle products optimized for maximum layer strength.
            </p>
          </div>

          <ProductGrid onAddToCart={handleAddCatalogProduct} />
        </section>

        {/* SECTION 4: HOW IT WORKS STEP-BY-STEP */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-zinc-900/60 to-zinc-950 border border-zinc-800">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              The 4-Step Manufacturing Pipeline
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              From raw polygon mesh to industrial finished part at your doorstep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-cyan-500/40">
                      {s.step}
                    </span>
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100">{s.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
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
