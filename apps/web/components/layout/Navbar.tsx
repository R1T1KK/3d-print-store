"use client";

import React from "react";
import { Box, ShoppingBag, UploadCloud, Layers } from "lucide-react";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onScrollToQuote: () => void;
  onScrollToCatalog: () => void;
  onScrollToViewer: () => void;
}

export default function Navbar({
  cartCount,
  onOpenCart,
  onScrollToQuote,
  onScrollToCatalog,
  onScrollToViewer,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-zinc-100 font-sans">
              FABRIC<span className="text-cyan-400">3D</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              STUDIO
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400">
          <button
            onClick={onScrollToViewer}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" /> 3D Stage
          </button>
          <button
            onClick={onScrollToQuote}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Custom Quote
          </button>
          <button
            onClick={onScrollToCatalog}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
          >
            <Box className="w-3.5 h-3.5" /> Ready Catalog
          </button>
        </nav>

        {/* Actions: Instant Upload CTA + Cart Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onScrollToQuote}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-all shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload STL</span>
          </button>

          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all"
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-zinc-950 font-mono text-[11px] font-bold flex items-center justify-center animate-in zoom-in shadow-md">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
