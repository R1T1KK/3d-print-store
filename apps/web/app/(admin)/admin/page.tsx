"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingBag,
  Layers,
  Box,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface MetricsData {
  totalRevenuePaise: number;
  totalRevenueInr: number;
  orders: {
    total: number;
    pendingPayment: number;
    paid: number;
    inProduction: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    activeFulfillment: number;
  };
  jobs: {
    submitted: number;
    approved: number;
    rejected: number;
    total: number;
  };
  products: {
    total: number;
    active: number;
  };
}

interface RecentOrder {
  id: string;
  createdAt: string;
  totalInr: number;
  status: string;
  customerEmail: string;
  customerName: string;
  itemsCount: number;
}

interface RecentJob {
  id: string;
  createdAt: string;
  fileName: string;
  material: string;
  color: string;
  priceInr: number;
  status: string;
  customerEmail: string;
  volumeMm3?: number | null;
  isWatertight?: boolean | null;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadMetrics() {
      try {
        const res = await fetch("/api/admin/metrics");
        if (!res.ok) throw new Error("Failed to load metrics.");
        const data = await res.json();
        if (!ignore) {
          setMetrics(data.metrics);
          setRecentOrders(data.recentOrders || []);
          setRecentJobs(data.recentJobs || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Dashboard metrics error:", err);
          setError("Unable to load live manufacturing metrics from PostgreSQL.");
          setLoading(false);
        }
      }
    }
    loadMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) throw new Error("Failed to load metrics.");
      const data = await res.json();
      setMetrics(data.metrics);
      setRecentOrders(data.recentOrders || []);
      setRecentJobs(data.recentJobs || []);
    } catch (err: unknown) {
      console.error("Dashboard metrics error:", err);
      setError("Unable to load live manufacturing metrics from PostgreSQL.");
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-800/60";
      case "IN_PRODUCTION":
        return "bg-blue-950/80 text-blue-400 border-blue-800/60";
      case "SHIPPED":
        return "bg-purple-950/80 text-purple-400 border-purple-800/60";
      case "DELIVERED":
        return "bg-cyan-950/80 text-cyan-400 border-cyan-800/60";
      case "CANCELLED":
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
      default:
        return "bg-amber-950/80 text-amber-400 border-amber-800/60";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Manufacturing Studio Dashboard</span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Real-time shop floor operations, job review queue, and fulfillment lifecycle.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleRefresh} className="underline hover:text-rose-300 ml-4">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Paid Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {loading ? "..." : `₹${metrics?.totalRevenueInr.toLocaleString() || "0"}`}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Captured via Razorpay Test Gateway</span>
          </div>
        </div>

        {/* Card 2: Active Orders */}
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">In Fulfillment</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {loading ? "..." : metrics?.orders.activeFulfillment || 0}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1">
            {metrics?.orders.inProduction || 0} in production · {metrics?.orders.shipped || 0} shipped
          </div>
        </div>

        {/* Card 3: Pending Custom Jobs */}
        <Link
          href="/admin/jobs"
          className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-cyan-500/40 group transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono flex items-center gap-2">
            <span>{loading ? "..." : metrics?.jobs.submitted || 0}</span>
            {(metrics?.jobs.submitted || 0) > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/60 font-sans font-semibold">
                Action Needed
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1 group-hover:text-cyan-400 transition-colors">
            Custom mesh slicing approvals ↗
          </div>
        </Link>

        {/* Card 4: Catalog Products */}
        <Link
          href="/admin/products"
          className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-cyan-500/40 group transition-all"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider">Catalog Items</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            {loading ? "..." : metrics?.products.active || 0}
            <span className="text-sm font-normal text-zinc-500 font-sans ml-1">
              / {metrics?.products.total || 0}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono mt-1 group-hover:text-cyan-400 transition-colors">
            Manage inventory & pricing ↗
          </div>
        </Link>
      </div>

      {/* Two Column Layout: Recent Orders & Pending Custom Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recent Orders */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-zinc-200">Recent Customer Orders</h2>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
              >
                <span>View all ({metrics?.orders.total || 0})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                No orders recorded in database yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recentOrders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-200">
                          #{o.id.slice(0, 8)}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getOrderStatusBadge(
                            o.status
                          )}`}
                        >
                          {o.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {o.customerEmail} · {o.itemsCount} item(s)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-zinc-100">
                        ₹{o.totalInr}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800/60 mt-4">
            <Link
              href="/admin/orders"
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            >
              <span>Manage Fulfillment Workflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Custom Jobs Queue */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-zinc-200">Custom Print Jobs Pending Review</h2>
              </div>
              <Link
                href="/admin/jobs"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
              >
                <span>Full queue ↗</span>
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                Loading custom job queue...
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                No submitted custom print jobs pending approval.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recentJobs.map((j) => (
                  <div key={j.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-200 truncate">
                          {j.fileName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-amber-950/80 text-amber-400 border-amber-800/60">
                          SUBMITTED
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {j.customerEmail} · {j.material} ({j.color})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-bold text-zinc-100">
                        ₹{j.priceInr}
                      </div>
                      <Link
                        href="/admin/jobs"
                        className="text-[10px] text-cyan-400 hover:underline font-mono inline-block mt-0.5"
                      >
                        Inspect in 3D ↗
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800/60 mt-4">
            <Link
              href="/admin/jobs"
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-950/30 border border-cyan-800/50 rounded-lg hover:border-cyan-600/60 transition-colors"
            >
              <span>Review Custom Prints with 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
