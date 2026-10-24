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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-3 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500">Decrypting account profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4" /> Store
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-zinc-950">
                <Box className="w-4 h-4" />
              </div>
              <span className="text-sm font-extrabold tracking-tight text-zinc-100">
                FABRIC<span className="text-cyan-400">3D</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data?.user.role === "ADMIN" && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] font-bold">
                ADMIN ACCESS
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-rose-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Hero Banner */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-zinc-950 font-bold text-xl shadow-lg shadow-cyan-500/20">
              {data?.user?.name ? data.user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-50">
                  {data?.user?.name || "Customer Account"}
                </h1>
                {data?.user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                    <Clock className="w-3 h-3" /> Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{data?.user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Orders</span>
              <span className="font-bold text-zinc-100">{data?.orders?.length || 0}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">3D Models</span>
              <span className="font-bold text-cyan-400">{data?.models?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 space-x-6 text-xs font-semibold mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "profile"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-4 h-4" /> Profile & Addresses
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "orders"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Package className="w-4 h-4" /> Order History ({data?.orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "jobs"
                ? "border-cyan-500 text-cyan-400"
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
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" /> Account Identity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Email Address (Immutable)</label>
                    <input
                      type="email"
                      disabled
                      value={data?.user.email || ""}
                      className="w-full px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800/60 text-xs text-zinc-500 font-mono outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" /> Shipping & Delivery Details
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Street Address</label>
                    <input
                      type="text"
                      value={editLine1}
                      onChange={(e) => setEditLine1(e.target.value)}
                      placeholder="House / Flat / Tech Park / Street"
                      className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">City</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Bengaluru"
                        className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">State</label>
                      <input
                        type="text"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        placeholder="Karnataka"
                        className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none"
                      />
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <label className="text-xs font-semibold text-zinc-400">PIN Code</label>
                      <input
                        type="text"
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                        placeholder="560001"
                        className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Contact Phone</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-400">Country</label>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-xs text-zinc-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/20"
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
              <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
                <Package className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No Orders Placed Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Browse our ready-to-print mechanical engineering catalog or upload a custom STL.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-all mt-2"
                >
                  Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          #{order.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
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
                      <span className="font-mono text-sm font-bold text-cyan-400">
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
              <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800 text-center space-y-3">
                <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-300">No Custom 3D Models Uploaded</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Drag and drop your STL, OBJ, or 3MF files onto the simulated print bed to generate
                  instant quotes.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-all mt-2"
                >
                  Upload 3D Model <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.models.map((model) => (
                  <div
                    key={model.id}
                    className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          {model.fileName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
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
                          <span className="font-mono text-xs font-bold text-cyan-400 block">
                            ₹{(model.quotes[0].priceTotal / 100).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
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
