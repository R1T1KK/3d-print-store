"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthVisualPanel from "@/components/auth/AuthVisualPanel";
import OtpInput from "@/components/auth/OtpInput";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Box,
  KeyRound,
  RefreshCw,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const verifiedNotice = searchParams.get("verified") === "true";
  const resetNotice = searchParams.get("reset") === "true";

  // Mode: "password" or "otp"
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");

  // Password mode states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP mode states
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    verifiedNotice
      ? "Your email has been verified successfully. Please log in."
      : resetNotice
      ? "Password reset successful! Please log in with your new password."
      : null
  );

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle standard password login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("invalid login credentials") ||
          error.message.toLowerCase().includes("invalid grant")
        ) {
          setErrorMessage("Invalid email or password. Please verify your credentials or sign in with OTP.");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMessage(
            "Your email address has not been confirmed yet. You can sign in directly using the 'Sign In with OTP' option."
          );
        } else {
          setErrorMessage(error.message || "Failed to sign in. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        setSuccessMessage("Authentication successful! Redirecting...");
        fetch("/api/account/profile").catch(() => {});

        setTimeout(() => {
          router.push(redirectPath.startsWith("/") ? redirectPath : "/account");
          router.refresh();
        }, 500);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setErrorMessage("An unexpected network error occurred. Please check your connection.");
      setLoading(false);
    }
  };

  // Dispatch 6-digit login OTP
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = (otpEmail || email).trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address to receive a login code.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setOtpEmail(cleanEmail);
    setSendingOtp(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, purpose: "login" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to dispatch verification code.");
        setSendingOtp(false);
        return;
      }

      setOtpStep("verify");
      setResendCooldown(data.cooldown || 60);
      setSuccessMessage(`A 6-digit login code has been dispatched to ${cleanEmail}`);
    } catch {
      setErrorMessage("Network error while sending login code. Please check your connection.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify 6-digit login OTP and establish session
  const handleVerifyLoginOtp = async (targetCode: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = targetCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    const cleanEmail = otpEmail.trim();
    if (!cleanEmail) {
      setErrorMessage("Email address is missing. Please restart the sign in.");
      return;
    }

    setVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          purpose: "login",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Invalid or expired verification code.");
        setVerifyingOtp(false);
        return;
      }

      setSuccessMessage("Code verified! Establishing secure session...");

      // Authenticate browser session using generated token or action link
      const supabase = createClient();

      if (data.token_hash) {
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: (data.verification_type as "magiclink" | "signup" | "recovery" | "invite" | "email") || "magiclink",
        });

        if (sessionError && data.action_link) {
          window.location.href = data.action_link;
          return;
        }
      } else if (data.action_link) {
        window.location.href = data.action_link;
        return;
      }

      // Synchronize database profile
      await fetch("/api/account/profile").catch(() => {});

      setTimeout(() => {
        router.push(redirectPath.startsWith("/") ? redirectPath : "/account");
        router.refresh();
      }, 500);
    } catch (err: unknown) {
      console.error("OTP login verification error:", err);
      setErrorMessage("An unexpected error occurred while logging in. Please try again.");
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
      {/* Top Bar with Home Link & Mobile Logo */}
      <div className="flex items-center justify-between pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Store
        </Link>
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-zinc-950">
            <Box className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-100">
            FABRIC<span className="text-cyan-400">3D</span>
          </span>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="my-auto space-y-6">
        <div className="space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
            Customer Authentication
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
            Sign In to Your Account
          </h1>
          <p className="text-xs sm:text-sm text-white/50 font-sans">
            Access your 3D orders, custom mesh quotations, and saved print configurations.
          </p>
        </div>

        {/* Tab Switcher: Password vs OTP Login */}
        <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-full text-center transition-all cursor-pointer ${
              authMode === "password"
                ? "bg-white text-black shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            Password Sign-In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setErrorMessage(null);
              if (email && !otpEmail) setOtpEmail(email);
            }}
            className={`flex-1 py-2 px-3 rounded-full text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === "otp"
                ? "bg-white text-black shadow-sm"
                : "text-white/60 hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In with OTP</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODE 1: Standard Password Login */}
        {/* ================================================================= */}
        {authMode === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/70" htmlFor="login-email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@fabric3d.io"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-white/30 outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-white/70" htmlFor="login-password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-white/30 outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#0e0e0e] border-white/20 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="text-xs text-white/50">Remember this device for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.01] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* MODE 2: Passwordless 6-Digit OTP Login */}
        {/* ================================================================= */}
        {authMode === "otp" && (
          <div className="space-y-4">
            {otpStep === "request" ? (
              <form onSubmit={handleSendLoginOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-white/70" htmlFor="otp-login-email">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="otp-login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="engineer@fabric3d.io"
                      disabled={sendingOtp}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0e0e0e] border border-white/10 focus:border-emerald-500 text-sm text-white placeholder-white/30 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[11px] text-white/40 pt-1">
                    We will send a secure 6-digit verification code directly to your Gmail inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full mt-3 py-3.5 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.01] flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {sendingOtp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Sending Login Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send 6-Digit Login Code</span>
                    </>
                  )}
                </button>
              </form>
            ) : (

              /* Step 2: 6-Digit OTP Entry */
              <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-400">Code sent to: </span>
                    <span className="font-mono text-cyan-400 font-semibold">{otpEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("request");
                      setOtpCode("");
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <OtpInput
                    length={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={(code) => handleVerifyLoginOtp(code)}
                    disabled={verifyingOtp}
                    autoFocus={true}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSendLoginOtp()}
                    disabled={resendCooldown > 0 || sendingOtp}
                    className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${sendingOtp ? "animate-spin" : ""}`} />
                    <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyLoginOtp(otpCode)}
                    disabled={verifyingOtp || otpCode.trim().length !== 6}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-zinc-950 font-bold text-xs hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-cyan-500/20"
                  >
                    {verifyingOtp ? "Authenticating..." : "Verify & Sign In"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alternate link to Register */}
        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          New to FABRIC3D?{" "}
          <Link
            href={`/register${redirectPath !== "/account" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-6 text-center text-[11px] text-zinc-600 font-mono">
        Encrypted Session · TLS 1.3 · High-Precision 3D Manufacturing
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <AuthVisualPanel
        title="Engineering Account Access"
        subtitle="Sign in via password or 6-digit email OTP to review custom print quotes, inspect 3D manifold diagnostics, and track orders."
      />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-mono">
            Loading authentication portal...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
