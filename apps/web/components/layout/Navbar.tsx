"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Box,
  ShoppingBag,
  UploadCloud,
  Layers,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
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
      // Supabase credentials may not be configured yet
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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
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
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400">
          <button
            onClick={onScrollToViewer}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" /> 3D Stage
          </button>
          <button
            onClick={onScrollToQuote}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" /> Custom Quote
          </button>
          <button
            onClick={onScrollToCatalog}
            className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" /> Ready Catalog
          </button>
        </nav>

        {/* Actions: Instant Upload CTA + Auth User Menu + Cart Trigger */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Portal</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
            </Link>
          )}

          <button
            onClick={onScrollToQuote}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload STL</span>
          </button>

          {/* User Account / Sign In Trigger */}
          {userEmail ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-200 transition-all cursor-pointer"
              >
                <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline-block max-w-[100px] truncate">
                  {userEmail.split("@")[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl py-1 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Signed in as</span>
                    <span className="text-zinc-200 truncate font-mono block">{userEmail}</span>
                  </div>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-cyan-300 hover:bg-cyan-950/40 border-b border-zinc-800 transition-colors font-semibold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Admin Console</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase">
                        Admin
                      </span>
                    </Link>
                  )}

                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-cyan-400 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> Account & Orders
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-zinc-900 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all cursor-pointer"
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
