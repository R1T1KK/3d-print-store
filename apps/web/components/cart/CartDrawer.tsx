"use client";

import React from "react";
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export interface CartItem {
  id: string;
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
  const progressToFreeShipping = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingFee = subtotal >= freeShippingThreshold || items.length === 0 ? 0 : 79;
  const total = subtotal + shippingFee;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-zinc-100">Your Print Cart</h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="mt-4 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs">
            <div className="flex justify-between font-medium text-zinc-300 mb-1.5">
              {remainingForFreeShipping > 0 ? (
                <span>
                  Add <span className="font-bold text-cyan-400">₹{remainingForFreeShipping}</span> for FREE Pan-India Shipping
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  🎉 You unlocked FREE Pan-India Shipping!
                </span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="mt-6 space-y-3 max-h-[48vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-zinc-700" />
                <p>Your cart is empty.</p>
                <p className="text-zinc-600">Explore catalog or upload a custom STL to get started!</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-zinc-100 line-clamp-1">{item.title}</div>
                    {item.material && (
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                        Material: {item.material}
                      </div>
                    )}
                    <div className="text-xs font-mono font-bold text-zinc-200 mt-1">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold text-zinc-100 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer & Checkout Summary */}
        <div className="pt-6 border-t border-zinc-800 space-y-3 mt-6">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal:</span>
              <span className="font-mono text-zinc-200">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Pan-India Courier:</span>
              <span className="font-mono text-zinc-200">
                {shippingFee === 0 ? <span className="text-emerald-400">FREE</span> : `₹${shippingFee}`}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-zinc-100 pt-2 border-t border-zinc-800/80">
              <span>Total Payable:</span>
              <span className="font-mono text-cyan-400 text-lg">₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={items.length === 0}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <span>Proceed to Razorpay Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-bit Secure
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Dispatch in 48h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
