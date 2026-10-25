"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingBag,
  UploadCloud,
  Layers,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Package,
} from "lucide-react";

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
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function checkRole(email: string | null, metaRole?: string) {
      if (metaRole === "ADMIN") {
        if (!ignore) setIsAdmin(true);
        return;
      }
      if (!email) {
        if (!ignore) setIsAdmin(false);
        return;
      }
      try {
        const res = await fetch("/api/account/profile");
        if (res.ok) {
          const profile = await res.json();
          if (!ignore) setIsAdmin(profile?.user?.role === "ADMIN");
        } else {
          if (!ignore) setIsAdmin(false);
        }
      } catch {
        if (!ignore) setIsAdmin(false);
      }
    }

    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        const email = session?.user?.email ?? null;
        if (!ignore) setUserEmail(email);
        const metaRole =
          (session?.user?.app_metadata?.role as string | undefined) ||
          (session?.user?.user_metadata?.role as string | undefined);
        checkRole(email, metaRole);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const email = session?.user?.email ?? null;
        if (!ignore) setUserEmail(email);
        const metaRole =
          (session?.user?.app_metadata?.role as string | undefined) ||
          (session?.user?.user_metadata?.role as string | undefined);
        checkRole(email, metaRole);
      });

      return () => {
        ignore = true;
        subscription.unsubscribe();
      };
    } catch {
      // Supabase optional
    }
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserEmail(null);
      setIsAdmin(false);
      setMenuOpen(false);
      router.push("/");
      router.refresh();
    } catch {
      router.push("/");
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3.5"
          : "bg-transparent py-5 sm:py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
        {/* Left: Brand Identity & Links */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Minimal line-art 3D geometric prism mark */}
            <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center transition-transform group-hover:scale-105">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-[-0.02em] text-white font-heading">
              FABRIC<span className="text-emerald-400 font-bold">3D</span>
            </span>
          </Link>

          {/* Navigation items */}
          <nav className="hidden md:flex items-center gap-7">
            <button
              onClick={onScrollToViewer}
              className="text-[14px] font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              3D Simulator
            </button>
            <button
              onClick={onScrollToQuote}
              className="text-[14px] font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Instant Quote
            </button>
            <button
              onClick={onScrollToCatalog}
              className="text-[14px] font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Catalog
            </button>
          </nav>
        </div>

        {/* Right Actions: Admin / Auth / Cart / CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all backdrop-blur-md"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Admin Portal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </Link>
          )}

          {/* User Account Dropdown */}
          {userEmail ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-medium text-white/90 transition-all cursor-pointer backdrop-blur-md"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline-block max-w-[90px] truncate">
                  {userEmail.split("@")[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-white/50" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-[#0c0c0c] border border-white/15 rounded-2xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-xl"
                  >
                    <div className="px-3.5 py-2 border-b border-white/10">
                      <span className="text-[10px] text-white/40 uppercase font-mono block">Account</span>
                      <span className="text-white/90 truncate font-mono block">{userEmail}</span>
                    </div>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-emerald-300 hover:bg-emerald-950/40 border-b border-white/10 transition-colors font-semibold"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Package className="w-3.5 h-3.5" /> Order History
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-400 hover:bg-white/5 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium text-white/80 hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Cart Pill */}
          <button
            onClick={onOpenCart}
            aria-label="Open Shopping Cart"
            className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-all cursor-pointer backdrop-blur-md"
          >
            <ShoppingBag className="w-4 h-4 text-white/90" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-black flex items-center justify-center shadow-lg">
                {cartCount}
              </span>
            )}
          </button>

          {/* White Aurora Pill CTA */}
          <motion.button
            onClick={onScrollToQuote}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2 rounded-full text-xs font-semibold text-black bg-white hover:bg-white/90 transition-all shadow-[0_4px_18px_rgba(0,0,0,0.3)] cursor-pointer"
          >
            Upload STL
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}

