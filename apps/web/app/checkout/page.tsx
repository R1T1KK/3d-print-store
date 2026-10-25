"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CartItem } from "@/components/cart/CartDrawer";
import {
  ShieldCheck,
  Lock,
  ArrowLeft,
  Truck,
  Package,
  AlertCircle,
  RefreshCw,
  Box,
  Layers,
  MapPin,
} from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loadingUser, setLoadingUser] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Cart state loaded from localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Shipping Address Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");

  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayNotice, setRazorpayNotice] = useState<string | null>(null);

  // 1. Authenticate user & prefill saved profile address
  useEffect(() => {
    async function initUser() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login?redirect=/checkout");
          return;
        }

        setUserEmail(session.user.email ?? null);

        // Fetch saved profile address
        const res = await fetch("/api/account/profile");
        if (res.ok) {
          const profile = await res.json();
          if (profile.user?.name) setFullName(profile.user.name);

          const addr = profile.addresses?.[0];
          if (addr) {
            if (addr.phone) setPhone(addr.phone);
            if (addr.line1) setLine1(addr.line1);
            if (addr.line2) setLine2(addr.line2);
            if (addr.city) setCity(addr.city);
            if (addr.state) setState(addr.state);
            if (addr.postalCode) setPostalCode(addr.postalCode);
            if (addr.country) setCountry(addr.country);
          }
        }
      } catch (err) {
        console.error("Checkout init error:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    initUser();
  }, [router]);

  // 2. Load Cart from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("fabric3d_cart");
        if (saved) {
          setCartItems(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Failed to load saved cart:", e);
      } finally {
        setCartLoaded(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync cart mutations to localStorage
  const updateCart = (items: CartItem[]) => {
    setCartItems(items);
    try {
      localStorage.setItem("fabric3d_cart", JSON.stringify(items));
    } catch {}
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === id) {
          const next = item.quantity + delta;
          return next > 0 ? { ...item, quantity: next } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    updateCart(updated);
  };

  const handleRemoveItem = (id: string) => {
    updateCart(cartItems.filter((i) => i.id !== id));
  };

  // Pricing calculations
  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = 999;
  const isTestCheckout = cartItems.some((i) => i.productId === "test-print-1" || i.price === 1);
  const shippingFee =
    isTestCheckout || subtotal >= FREE_SHIPPING_THRESHOLD || cartItems.length === 0 ? 0 : 79;
  const grandTotal = subtotal + shippingFee;

  // 3. Dynamically inject and guarantee Razorpay Checkout Script is ready
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && typeof (window as unknown as { Razorpay?: unknown }).Razorpay !== "undefined") {
        resolve(true);
        return;
      }
      const scriptId = "razorpay-checkout-js";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener("load", () => resolve(true));
      script.addEventListener("error", () => resolve(false));
      // Fallback timer check
      setTimeout(() => {
        resolve(typeof (window as unknown as { Razorpay?: unknown }).Razorpay !== "undefined");
      }, 1500);
    });
  };

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // 4. Submit Order & Launch Razorpay Hosted Modal
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRazorpayNotice(null);

    // Form validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage("Please enter recipient's full name.");
      return;
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit phone number for delivery updates.");
      return;
    }
    if (!line1.trim() || line1.trim().length < 5) {
      setErrorMessage("Please enter a complete street address.");
      return;
    }
    if (!city.trim() || !state.trim()) {
      setErrorMessage("City and State are required.");
      return;
    }
    const cleanPin = postalCode.trim().replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanPin)) {
      setErrorMessage("Please enter a valid 6-digit Indian PIN postal code.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Your cart is empty. Add items before checking out.");
      return;
    }

    setProcessingPayment(true);

    try {
      // 1. Invoke server-side checkout validation (recalculates prices server-side)
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.productId,
            quoteId: item.quoteId,
            quantity: item.quantity,
          })),
          shippingAddress: {
            fullName: fullName.trim(),
            phone: cleanPhone,
            line1: line1.trim(),
            line2: line2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            postalCode: cleanPin,
            country: country.trim() || "India",
          },
        }),
      });

      const checkoutData = await res.json();

      if (!res.ok) {
        setErrorMessage(checkoutData.error || "Failed to process order.");
        setProcessingPayment(false);
        return;
      }

      // Case A: Razorpay credentials are not yet configured in .env.local
      if (!checkoutData.isConfigured || !checkoutData.keyId) {
        setRazorpayNotice(
          checkoutData.setupNotice ||
            "Order created with status PENDING_PAYMENT. Add RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET to activate live gateway payment."
        );
        setProcessingPayment(false);
        return;
      }

      // Case B: Launch Razorpay Hosted Checkout Modal
      const isScriptReady = await loadRazorpayScript();
      if (!isScriptReady || typeof window.Razorpay === "undefined") {
        setErrorMessage(
          "Payment gateway script failed to load. Please check your internet connection and try again."
        );
        setProcessingPayment(false);
        return;
      }

      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amountPaise,
        currency: checkoutData.currency || "INR",
        name: "FABRIC3D STUDIO",
        description: `Order #${checkoutData.orderId.slice(0, 8)}`,
        order_id: checkoutData.razorpayOrderId,
        prefill: {
          name: checkoutData.customer.name,
          email: checkoutData.customer.email,
          contact: checkoutData.customer.phone,
        },
        theme: {
          color: "#10b981", // Aurora Emerald
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          try {
            // Server-side HMAC signature verification
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: checkoutData.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              // Clear cart upon successful verified payment
              localStorage.removeItem("fabric3d_cart");
              router.push(`/order-success/${checkoutData.orderId}`);
            } else {
              setErrorMessage(
                verifyData.error ||
                  "Payment signature verification failed. Please contact support."
              );
              setProcessingPayment(false);
            }
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            setErrorMessage("Network error verifying payment. Please check your account.");
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rzp.on("payment.failed", function (resp: any) {
        console.error("Razorpay payment failed:", resp.error);
        setErrorMessage(resp.error?.description || "Payment failed. Please retry.");
        setProcessingPayment(false);
      });

      rzp.open();
    } catch (err: unknown) {
      console.error("Checkout submission error:", err);
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setProcessingPayment(false);
    }
  };

  if (loadingUser || !cartLoaded) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white/40">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono">Securing Checkout Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      <Navbar
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => {}}
        onScrollToQuote={() => router.push("/")}
        onScrollToCatalog={() => router.push("/")}
        onScrollToViewer={() => router.push("/")}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-10 sm:py-16">
        {/* Top Breadcrumb / Return */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Store
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-xs font-semibold text-white font-heading">Secure Checkout</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full backdrop-blur-md">
            <Lock className="w-3.5 h-3.5" />
            <span>256-bit SSL Encrypted</span>
          </div>
        </div>


        {cartItems.length === 0 ? (
          <div className="max-w-xl mx-auto p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <Package className="w-12 h-12 text-zinc-600 mx-auto" />
            <h2 className="text-lg font-bold text-zinc-200">Your Cart is Empty</h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              You haven&apos;t added any 3D printable products or custom quotes yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20"
            >
              <Box className="w-4 h-4" /> Browse Catalog & 3D Stage
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: Shipping & Delivery Form */}
            <div className="lg:col-span-7 space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {razorpayNotice && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Razorpay Test Gateway Notice</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{razorpayNotice}</p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    To enable instant payments, configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env.local.
                  </p>
                </div>
              )}

              <form onSubmit={handleProceedToPayment} className="space-y-6">
                {/* Shipping Details Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a]/90 border border-white/10 space-y-5 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-heading">
                      <MapPin className="w-4 h-4 text-emerald-400" /> Shipping & Delivery Details
                    </h3>
                    <span className="text-[11px] text-white/50 font-mono">
                      {userEmail ? `Account: ${userEmail}` : "All-India Courier"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Recipient Full Name *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Abhay Mishra"
                        className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">Mobile Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white font-mono outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="House / Flat No., Building, Street"
                      className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/60">Apartment, Landmark, Suite (Optional)</label>
                    <input
                      type="text"
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      placeholder="Near landmark or floor"
                      className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-white/60">State *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-xs font-medium text-white/60">PIN Code *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="6-digit PIN"
                        className="w-full px-4 py-3 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-xs text-white font-mono outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Gateway Box */}
                <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a]/90 border border-white/10 space-y-4 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-heading">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Payment Gateway
                    </h3>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Razorpay Hosted Checkout
                    </span>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed font-sans">
                    Supports UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards (Visa, MasterCard, RuPay), Net Banking & EMI across India.
                  </p>

                  <button
                    type="submit"
                    disabled={processingPayment || cartItems.length === 0}
                    className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.01] disabled:opacity-50 cursor-pointer"
                  >
                    {processingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Securing Razorpay Session...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pay ₹{grandTotal.toLocaleString("en-IN")} via Razorpay</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[11px] text-white/40 pt-1">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Server Verified Total
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" /> Insured Transit
                    </span>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Column: Order Summary & Item List */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0a0a]/90 border border-white/10 sticky top-24 space-y-5 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 font-heading">
                    <Package className="w-4 h-4 text-emerald-400" /> Order Summary
                  </h3>
                  <span className="text-xs font-mono text-white/40">
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)} item(s)
                  </span>
                </div>

                {/* Items Scroll Area */}
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {item.type === "custom" ? (
                            <Layers className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Box className="w-4 h-4 text-white/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white truncate font-heading">{item.title}</h4>
                          <p className="text-[10px] text-white/50 truncate mt-0.5 font-sans">{item.subtitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/60 font-mono">
                              ₹{item.price.toLocaleString("en-IN")} × {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-white/40 hover:text-rose-400 ml-1 text-xs cursor-pointer"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Free Shipping Progress */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-white/60">
                      <span>Items Subtotal:</span>
                      <span className="font-mono text-white/90">₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between text-white/60">
                      <span>Express Courier (Pan-India):</span>
                      <span className="font-mono text-white/90">
                        {shippingFee === 0 ? (
                          <span className="text-emerald-400 font-bold">FREE</span>
                        ) : (
                          `₹${shippingFee}`
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-semibold text-white pt-3 border-t border-white/10">
                      <span className="font-heading">Total Amount:</span>
                      <span className="font-mono text-emerald-400 text-lg font-bold">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Free shipping bar */}
                  <div className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-2">
                    <div className="flex justify-between text-[11px] text-white/60">
                      <span>Free Shipping Threshold</span>
                      <span className="font-mono text-white/80">
                        {subtotal >= FREE_SHIPPING_THRESHOLD
                          ? "Unlocked! (Free)"
                          : `Add ₹${(FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString("en-IN")} more`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
