"use client";

import React from "react";
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export interface CartItem {
  id: string;
  productId?: string;
  quoteId?: string;
  title: string;
  subtitle?: string;
  price: number;
  quantity: number;
  material?: string;
  type: "catalog" | "custom";
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const freeShippingThreshold = 999;
  const isTestCheckout = items.some((i) => i.productId === "test-print-1" || i.price === 1);
  const progressToFreeShipping = isTestCheckout ? 100 : Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = isTestCheckout ? 0 : Math.max(0, freeShippingThreshold - subtotal);
  const shippingFee = isTestCheckout || subtotal >= freeShippingThreshold || items.length === 0 ? 0 : 79;
  const total = subtotal + shippingFee;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-[#080808]/95 border-l border-white/10 p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 overflow-y-auto backdrop-blur-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white font-heading">Your Print Cart</h3>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex justify-between font-medium text-white/70 mb-2">
              {remainingForFreeShipping > 0 ? (
                <span>
                  Add <span className="font-bold text-emerald-400">₹{remainingForFreeShipping}</span> for FREE Pan-India Shipping
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  FREE Pan-India Courier Unlocked
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="mt-6 space-y-3 max-h-[46vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="font-medium text-white/70">Your cart is empty.</p>
                <p className="text-white/40">Choose from ready catalog or upload your custom STL.</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white line-clamp-1">{item.title}</div>
                    {item.material && (
                      <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                        {item.material}
                      </div>
                    )}
                    <div className="text-xs font-mono font-bold text-white/90 mt-1.5">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-white w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 flex items-center justify-center text-xs transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 rounded-full text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer & Checkout Summary */}
        <div className="pt-6 border-t border-white/10 space-y-4 mt-6">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-white/60">
              <span>Subtotal:</span>
              <span className="font-mono text-white/90">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Courier Delivery:</span>
              <span className="font-mono text-white/90">
                {shippingFee === 0 ? <span className="text-emerald-400 font-medium">FREE</span> : `₹${shippingFee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-white pt-2.5 border-t border-white/10">
              <span className="font-heading">Total:</span>
              <span className="font-mono text-emerald-400 text-lg font-bold">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full py-3.5 px-6 rounded-full font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/30 text-black flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.01] cursor-pointer"
          >
            <span>Proceed to Razorpay Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-4 text-[11px] text-white/40">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-bit Encrypted
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> 48h Pan-India Dispatch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

