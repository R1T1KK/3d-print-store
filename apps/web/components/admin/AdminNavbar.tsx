"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Database, RefreshCw } from "lucide-react";

interface AdminNavbarProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Overview Dashboard",
  "/admin/products": "Catalog Product Management",
  "/admin/jobs": "Custom Print Job Review Queue",
  "/admin/orders": "Customer Order Fulfillment",
};

export default function AdminNavbar({ onRefresh, isRefreshing }: AdminNavbarProps) {
  const pathname = usePathname();
  const currentTitle = BREADCRUMB_MAP[pathname] || "Admin Console";

  return (
    <header className="h-16 px-6 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between sticky top-0 z-30">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <Link href="/admin" className="text-zinc-400 hover:text-emerald-400 transition-colors">
          Admin
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-white font-medium">{currentTitle}</span>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline font-mono text-[11px]">Sync</span>
          </button>
        )}

        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[11px] font-mono text-zinc-400">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>PostgreSQL Active</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-[11px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>GATEWAY LIVE</span>
        </div>
      </div>
    </header>
  );
}
