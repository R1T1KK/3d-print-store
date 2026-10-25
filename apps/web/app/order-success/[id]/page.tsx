"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  CheckCircle2,
  Clock,
  Package,
  ArrowRight,
  Truck,
  Box,
  Layers,
  MapPin,
} from "lucide-react";

interface OrderDetail {
  id: string;
  status: string;
  total: number;
  currency: string;
  paymentRef: string | null;
  addressJson: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  createdAt: string;
  items: Array<{
    id: string;
    productId?: string | null;
    quoteId?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.status === 401) {
          router.push(`/login?redirect=/order-success/${id}`);
          return;
        }
        if (res.status === 404) {
          setError("Order not found or access unauthorized.");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load order.");

        const data = await res.json();
        setOrder(data.order);
      } catch (err: unknown) {
        console.error("Order load error:", err);
        setError("Unable to load order details.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-500">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono">Loading Order Confirmation...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <Navbar
          cartCount={0}
          onOpenCart={() => {}}
          onScrollToQuote={() => router.push("/")}
          onScrollToCatalog={() => router.push("/")}
          onScrollToViewer={() => router.push("/")}
        />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 text-center space-y-4">
          <Package className="w-12 h-12 text-zinc-600 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-200">{error || "Order Not Found"}</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all"
          >
            Return to Homepage
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order.status === "PAID";
  const addr = order.addressJson;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <Navbar
        cartCount={0}
        onOpenCart={() => {}}
        onScrollToQuote={() => router.push("/")}
        onScrollToCatalog={() => router.push("/")}
        onScrollToViewer={() => router.push("/")}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
        {/* Status Header Banner */}
        <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
              isPaid
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-emerald-500/10"
                : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-cyan-500/10"
            }`}
          >
            {isPaid ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider mb-2 ${
                isPaid
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              Order Status: {order.status}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isPaid ? "Payment Confirmed!" : "Order Placed Successfully"}
            </h1>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
              {isPaid
                ? "Your commercial 3D manufacturing order has been verified. Production queue scheduling initiated."
                : "Your order is pending payment confirmation. Please complete payment or view details below."}
            </p>
          </div>

          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
            <span>Order ID:</span>
            <span className="font-bold text-cyan-400">#{order.id}</span>
            {order.paymentRef && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">Ref: {order.paymentRef.slice(0, 16)}</span>
              </>
            )}
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Items & Payment Summary */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" /> Manufacturing Items
            </h3>

            <div className="space-y-2.5">
              {order.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      {item.quoteId ? (
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Box className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200">
                        {item.quoteId ? "Custom 3D Print Part" : "Catalog Component"} #{idx + 1}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Qty: {item.quantity} × ₹{(item.unitPrice / 100).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-zinc-200">
                    ₹{((item.unitPrice * item.quantity) / 100).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Paid:</span>
              <span className="font-mono text-base font-extrabold text-cyan-400">
                ₹{(order.total / 100).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Delivery Snapshot */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" /> Shipping Destination
            </h3>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs">
              <div className="font-bold text-zinc-200">{addr?.fullName}</div>
              <div className="text-zinc-400 leading-relaxed">
                {addr?.line1}
                {addr?.line2 ? `, ${addr.line2}` : ""}
                <br />
                {addr?.city}, {addr?.state} — <span className="font-mono">{addr?.postalCode}</span>
                <br />
                {addr?.country || "India"}
              </div>
              <div className="text-zinc-400 pt-1 font-mono text-[11px]">Contact: {addr?.phone}</div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Standard delivery dispatch within 48h.</span>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/account"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <span>View in Account History</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Box className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
