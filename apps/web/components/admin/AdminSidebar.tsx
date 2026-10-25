"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Layers,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface AdminSidebarProps {
  userEmail?: string;
  userName?: string | null;
}

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Catalog Products",
    href: "/admin/products",
    icon: Box,
    badge: null,
  },
  {
    label: "Custom Print Jobs",
    href: "/admin/jobs",
    icon: Layers,
    badge: null,
  },
  {
    label: "Order Fulfillment",
    href: "/admin/orders",
    icon: ShoppingBag,
    badge: null,
  },
];

export default function AdminSidebar({ userEmail, userName }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (itemHref: string, exact?: boolean) => {
    if (exact) return pathname === itemHref;
    return pathname.startsWith(itemHref);
  };

  return (
    <aside className="w-64 bg-[#050505] border-r border-white/5 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wider text-white flex items-center gap-1.5 font-heading">
                <span>FABRIC3D</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                  ADMIN
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono tracking-tight">MANUFACTURING STUDIO</p>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            System Operations
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/20 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-emerald-400/70" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile & Storefront Return */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <Link
          href="/"
          className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-white/5 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span>Storefront Front-End</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">View ↗</span>
        </Link>

        <div className="px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-200 truncate">
              {userName || userEmail?.split("@")[0] || "Admin"}
            </div>
            <div className="text-[10px] text-zinc-500 truncate font-mono">
              {userEmail || "admin@fabric3d.in"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
