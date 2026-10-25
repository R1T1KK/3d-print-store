"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  MapPin,
  Package,
  Layers,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Box,
  Save,
  RefreshCw,
} from "lucide-react";

interface AccountData {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
    role: string;
    createdAt: string;
  };
  addresses: Array<{
    id: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string | null;
  }>;
  orders: Array<{
    id: string;
    status: string;
    total: number;
    currency: string;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  models: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    status: string;
    volumeMm3?: number | null;
    isWatertight?: boolean | null;
    createdAt: string;
    quotes: Array<{
      id: string;
      material: string;
      priceTotal: number;
      jobStatus: string;
    }>;
  }>;
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "jobs" | "addresses">("profile");

  // Form states for profile editing
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLine1, setEditLine1] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCountry, setEditCountry] = useState("India");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch("/api/account/profile");
        if (res.status === 401) {
          router.push("/login?redirect=/account");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");

        const json = await res.json();
        setData(json);
        setEditName(json.user?.name || "");

        const addr = json.addresses?.[0];
        if (addr) {
          setEditPhone(addr.phone || "");
          setEditLine1(addr.line1 || "");
          setEditCity(addr.city || "");
          setEditState(addr.state || "");
          setEditPostalCode(addr.postalCode || "");
          setEditCountry(addr.country || "India");
        }
      } catch (err) {
        console.error("Account load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          line1: editLine1,
          city: editCity,
          state: editState,
          postalCode: editPostalCode,
          country: editCountry,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col items-center justify-center space-y-3 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500">Decrypting account profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition-colors text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4" /> Store
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-tight text-white font-heading">
                FABRIC<span className="text-emerald-400">3D</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data?.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-semibold transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Portal</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Administrator Quick-Access Operational Banner */}
        {data?.user.role === "ADMIN" && (
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-heading">Administrator Privileges Active</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">STUDIO ADMIN</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You have full manufacturing access to custom print job review, 3D WebGL inspection, product catalog CRUD, and order fulfillment tracking.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/admin"
                className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Open Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* User Hero Banner */}
        <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
              {data?.user?.name ? data.user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white font-heading">
                  {data?.user?.name || "Customer Account"}
                </h1>
                {data?.user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                    <Clock className="w-3 h-3" /> Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{data?.user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/5">
              <span className="text-[10px] text-zinc-500 block uppercase">Orders</span>
              <span className="font-bold text-white">{data?.orders?.length || 0}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-white/5">
              <span className="text-[10px] text-zinc-500 block uppercase">3D Models</span>
              <span className="font-bold text-emerald-400">{data?.models?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 space-x-6 text-xs font-semibold mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-4 h-4" /> Profile & Addresses
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "orders"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Package className="w-4 h-4" /> Order History ({data?.orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === "jobs"
                ? "border-emerald-500 text-emerald-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" /> Custom 3D Print Jobs ({data?.models?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div className="max-w-2xl space-y-6">
            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Profile and address saved successfully.</span>
              </div>
            )}
            {saveError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Personal Details */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" /> Account Identity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Email Address (Immutable)</label>
                    <input
                      type="email"
                      disabled
                      value={data?.user.email || ""}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-xs text-zinc-500 font-mono outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Shipping & Delivery Details
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Street Address</label>
                    <input
                      type="text"
                      value={editLine1}
                      onChange={(e) => setEditLine1(e.target.value)}
                      placeholder="House / Flat / Tech Park / Street"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Bengaluru"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400">State</label>
                      <input
                        type="text"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        placeholder="Karnataka"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-xs font-semibold text-zinc-400">PIN Code</label>
                      <input
                        type="text"
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                        placeholder="560001"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none font-mono transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400">Contact Phone</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none font-mono transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400">Country</label>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.12)] active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile & Address</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {(!data?.orders || data.orders.length === 0) ? (
              <div className="p-12 rounded-3xl bg-zinc-900/30 border border-white/10 text-center space-y-3">
                <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white font-heading">No Orders Placed Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Browse our ready-to-print mechanical engineering catalog or upload a custom STL.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all mt-2"
                >
                  Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/order-success/${order.id}`}
                          className="font-mono text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          #{order.id.slice(0, 8)}
                          <ArrowRight className="w-3 h-3 text-emerald-400" />
                        </Link>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {order.items.length} item(s)
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        ₹{(order.total / 100).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom 3D Print Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {(!data?.models || data.models.length === 0) ? (
              <div className="p-12 rounded-3xl bg-zinc-900/30 border border-white/10 text-center space-y-3">
                <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-white font-heading">No Custom 3D Models Uploaded</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Drag and drop your STL, OBJ, or 3MF files onto the simulated print bed to generate
                  instant quotes.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all mt-2"
                >
                  Upload 3D Model <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.models.map((model) => (
                  <div
                    key={model.id}
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          {model.fileName}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            model.status === "VALID"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {model.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                        {(model.fileSize / 1024).toFixed(1)} KB ·{" "}
                        {model.volumeMm3 ? `${(model.volumeMm3 / 1000).toFixed(2)} cm³` : "Analyzing"}
                      </p>
                    </div>

                    <div className="text-right">
                      {model.quotes?.[0] ? (
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-bold text-emerald-400 block">
                            ₹{(model.quotes[0].priceTotal / 100).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
                            Status: {model.quotes[0].jobStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 font-mono">No active quote</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
