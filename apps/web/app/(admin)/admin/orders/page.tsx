"use client";

import React, { useEffect, useState } from "react";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  MapPin,
  Eye,
  X,
  CreditCard,
} from "lucide-react";

interface OrderItem {
  id: string;
  productId?: string | null;
  quoteId?: string | null;
  quantity: number;
  unitPricePaise: number;
  unitPriceInr: number;
  title: string;
}

interface Order {
  id: string;
  createdAt: string;
  status: "PENDING_PAYMENT" | "PAID" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  totalPaise: number;
  totalInr: number;
  currency: string;
  paymentRef: string | null;
  address: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  customer: {
    id?: string;
    email: string;
    name: string;
  };
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders.");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: unknown) {
      console.error("Orders load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load orders.");
        const data = await res.json();
        if (!ignore) {
          setOrders(data.orders || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          console.error("Orders load error:", err);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter, search]);

  const handleUpdateStatus = async (orderId: string, targetStatus: Order["status"]) => {
    try {
      setUpdating(true);
      setActionError(null);

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order status.");

      setToastMessage(`Order status updated to ${targetStatus.replace("_", " ")}.`);
      setTimeout(() => setToastMessage(null), 4000);

      // Update in state
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status: targetStatus });
      }
      reloadOrders();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const getBadgeClass = (status: string) => {
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
    <div className="space-y-6 max-w-7xl">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span>Customer Order Fulfillment Tracker</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {orders.length} Orders
            </span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Transition orders through manufacturing: PAID → IN_PRODUCTION → SHIPPED → DELIVERED.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "ALL", label: "All" },
            { id: "PAID", label: "Paid" },
            { id: "IN_PRODUCTION", label: "In Production" },
            { id: "SHIPPED", label: "Shipped" },
            { id: "DELIVERED", label: "Delivered" },
            { id: "PENDING_PAYMENT", label: "Pending Payment" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${statusFilter === tab.id
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/40"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, customer or payment ref..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Loading customer orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No orders matched the current filter.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Order ID & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-zinc-100 flex items-center gap-1.5">
                        <span>#{o.id.slice(0, 10)}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                      {o.paymentRef && (
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate max-w-[160px]">
                          Ref: {o.paymentRef}
                        </div>
                      )}
                    </td>

                    {/* Customer & Location */}
                    <td className="py-3.5 px-4">
                      <div className="text-zinc-200 font-medium">
                        {o.address?.fullName || o.customer.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {o.customer.email}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {o.address?.city}, {o.address?.state} {o.address?.postalCode}
                      </div>
                    </td>

                    {/* Line Items */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 max-w-xs">
                        {o.items.map((item) => (
                          <div key={item.id} className="text-[11px] text-zinc-300 truncate">
                            <span className="font-mono text-cyan-400">{item.quantity}×</span>{" "}
                            {item.title}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                      ₹{o.totalInr}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${getBadgeClass(
                          o.status
                        )}`}
                      >
                        {o.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-cyan-500 text-cyan-400 transition-colors inline-flex items-center gap-1.5 font-mono"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Fulfillment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" />
                  <span>Order Fulfillment Console</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getBadgeClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status.replace("_", " ")}
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Order ID: #{selectedOrder.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {actionError}
                </div>
              )}

              {/* Lifecycle Stepper */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-3">
                  Manufacturing Lifecycle Progression
                </span>
                <div className="flex items-center justify-between text-xs font-mono">
                  {[
                    { key: "PENDING_PAYMENT", label: "Order Placed" },
                    { key: "PAID", label: "Payment Captured" },
                    { key: "IN_PRODUCTION", label: "In Production" },
                    { key: "SHIPPED", label: "Dispatched" },
                    { key: "DELIVERED", label: "Delivered" },
                  ].map((step, idx) => {
                    const stepOrder = [
                      "PENDING_PAYMENT",
                      "PAID",
                      "IN_PRODUCTION",
                      "SHIPPED",
                      "DELIVERED",
                    ];
                    const currentIdx = stepOrder.indexOf(selectedOrder.status);
                    const isDone = currentIdx >= idx;
                    const isCurrent = selectedOrder.status === step.key;

                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${isCurrent
                              ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm shadow-cyan-500/30"
                              : isDone
                                ? "bg-emerald-950 text-emerald-400 border-emerald-700"
                                : "bg-zinc-900 text-zinc-600 border-zinc-800"
                            }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1.5 text-center hidden sm:inline ${isCurrent
                              ? "text-cyan-400 font-bold"
                              : isDone
                                ? "text-zinc-300"
                                : "text-zinc-600"
                            }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Address & Customer Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Shipping Destination</span>
                  </div>
                  <div className="font-semibold text-zinc-100">{selectedOrder.address?.fullName}</div>
                  <div className="text-zinc-400">{selectedOrder.address?.line1}</div>
                  {selectedOrder.address?.line2 && (
                    <div className="text-zinc-400">{selectedOrder.address?.line2}</div>
                  )}
                  <div className="text-zinc-300 font-mono">
                    {selectedOrder.address?.city}, {selectedOrder.address?.state}{" "}
                    {selectedOrder.address?.postalCode}
                  </div>
                  <div className="text-zinc-400 font-mono text-[11px] pt-1">
                    Phone: {selectedOrder.address?.phone}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5 mb-2">
                    <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Payment Verification</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Gateway Status:</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedOrder.status === "PENDING_PAYMENT" ? "Awaiting Payment" : "Verified Paid"}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Reference:</span>
                    <span className="text-zinc-300 truncate max-w-[150px]">
                      {selectedOrder.paymentRef || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-zinc-500">Total Paid:</span>
                    <span className="text-zinc-100 font-bold text-sm">₹{selectedOrder.totalInr}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Order Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400">
                  Itemized Manifest ({selectedOrder.items.length})
                </span>
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 divide-y divide-zinc-800/60">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-zinc-100">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          Qty: {item.quantity} × ₹{item.unitPriceInr}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-zinc-200">
                        ₹{item.quantity * item.unitPriceInr}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-zinc-500 font-mono">
                Status changes persist to Prisma database.
              </span>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "PAID" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "IN_PRODUCTION")}
                    disabled={updating}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "Start 3D Printing (In Production)"}
                  </button>
                )}

                {selectedOrder.status === "IN_PRODUCTION" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "SHIPPED")}
                    disabled={updating}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "Mark as Shipped (Dispatched)"}
                  </button>
                )}

                {selectedOrder.status === "SHIPPED" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "DELIVERED")}
                    disabled={updating}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold transition-colors disabled:opacity-50"
                  >
                    {updating ? "Updating..." : "Confirm Delivered to Customer"}
                  </button>
                )}

                {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "DELIVERED" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, "CANCELLED")}
                    disabled={updating}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
