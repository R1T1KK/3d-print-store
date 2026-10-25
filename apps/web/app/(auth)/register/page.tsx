"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthVisualPanel from "@/components/auth/AuthVisualPanel";
import PasswordStrength, { checkPasswordStrength } from "@/components/auth/PasswordStrength";
import OtpInput from "@/components/auth/OtpInput";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  Box,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inline OTP verification states (stays on the same registration page)
  const [isInlineOtpOpen, setIsInlineOtpOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendEmailOtp = async () => {
    setErrorMessage(null);
    setOtpError(null);
    setOtpSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address to receive an OTP code.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: fullName, password, purpose: "register" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send verification code.");
        setSendingOtp(false);
        return;
      }

      // Keep on the same page and expand the inline OTP box under Email
      setIsInlineOtpOpen(true);
      setResendCooldown(data.cooldown || 60);
      setOtpSuccess(`6-digit verification code sent to ${cleanEmail}`);
    } catch {
      setErrorMessage("Network error while dispatching OTP. Please check your connection.");
    } finally {
      setSendingOtp(false);
    }
  };

  const executeInlineVerification = async (targetOtp: string) => {
    setOtpError(null);
    setOtpSuccess(null);

    const cleanOtp = targetOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setOtpError("Email address is missing. Please enter your email.");
      return;
    }

    setVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanOtp,
          purpose: "register",
          password,
          name: fullName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Invalid or expired verification code.");
        setVerifyingOtp(false);
        return;
      }

      // Success: mark email as verified on the registration page
      setEmailVerified(true);
      setIsInlineOtpOpen(false);
      setOtpSuccess("Email verified successfully! Complete the form below to finish creating your account.");
      setVerifyingOtp(false);
    } catch (err: unknown) {
      console.error("OTP verification error:", err);
      setOtpError("An unexpected error occurred while verifying OTP. Please try again.");
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setOtpError(null);
    setOtpSuccess(null);
    setResending(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: fullName,
          password,
          purpose: "register",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Failed to resend code.");
      } else {
        setOtpSuccess("A new 6-digit verification code has been dispatched to your Gmail!");
        setResendCooldown(data.cooldown || 60);
      }
    } catch {
      setOtpError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validations
    const cleanName = fullName.trim();
    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

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

    // If email is not verified yet, open inline OTP and notify user
    if (!emailVerified) {
      setErrorMessage("Please verify your email address with the 6-digit OTP code before creating your account.");
      if (!isInlineOtpOpen) {
        handleSendEmailOtp();
      }
      return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.meetsLength) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (strength.score < 2) {
      setErrorMessage("Please choose a stronger password with a combination of letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please accept the Terms of Service to create an account.");
      return;
    }

    setLoading(true);

    try {
      // 1. Finalize account credentials in Supabase Admin + Prisma
      const completeRes = await fetch("/api/auth/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          name: cleanName,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        setErrorMessage(completeData.error || "Failed to finalize account credentials.");
        setLoading(false);
        return;
      }

      // 2. Establish authenticated session in the browser
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        console.error("Sign in after complete registration:", signInError);
        // Fallback: redirect to login
        router.push(`/login?verified=true&redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      // 3. Sync customer profile with database
      await fetch("/api/account/profile").catch(() => {});

      router.push(redirectPath.startsWith("/") ? redirectPath : "/account");
      router.refresh();
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setErrorMessage("An unexpected network error occurred. Please check your connection.");
      setLoading(false);
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

      {/* Main Form Container — ALWAYS on the Registration Page */}
      <div className="my-auto space-y-5">
        <div className="space-y-2">
          <div className="inline-block px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
            New Customer Account
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Join to upload custom CAD files, configure infill tolerances, and track orders.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
            {errorMessage.includes("GMAIL_APP_PASSWORD") && (
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-rose-500/20 text-[11px] text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-200">How to fix in 1 minute:</span>
                <ol className="list-decimal pl-4 space-y-0.5 text-zinc-400">
                  <li>Go to Google Account → Security → 2-Step Verification → App Passwords</li>
                  <li>Generate an App Password for &quot;Fabric3D&quot; (16 characters)</li>
                  <li>
                    Add <code className="text-cyan-400">GMAIL_USER=&quot;{email || "your-email@gmail.com"}&quot;</code> and{" "}
                    <code className="text-cyan-400">GMAIL_APP_PASSWORD=&quot;...&quot;</code> to{" "}
                    <code className="text-zinc-200">apps/web/.env.local</code>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300" htmlFor="register-name">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Arjun Sharma"
                disabled={loading || sendingOtp}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300" htmlFor="register-email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailVerified(false);
                }}
                placeholder="harshmishra9820@gmail.com"
                disabled={loading || sendingOtp || emailVerified}
                className={`w-full pl-10 pr-10 py-2.5 rounded-lg bg-zinc-900/90 border ${
                  emailVerified
                    ? "border-emerald-500/60 text-emerald-300"
                    : "border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-zinc-100"
                } text-sm placeholder-zinc-500 outline-none transition-all disabled:opacity-70`}
              />
              {emailVerified && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Email OTP State & Inline Verification — Directly Below Email Address */}
            {emailVerified ? (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Email verified: {email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailVerified(false);
                    setIsInlineOtpOpen(false);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            ) : isInlineOtpOpen ? (
              /* Inline 6-Digit OTP Drawer */
              <div className="mt-2.5 p-4 rounded-xl bg-zinc-950 border border-cyan-500/40 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      Enter 6-digit code sent to <span className="font-mono text-cyan-400">{email}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInlineOtpOpen(false);
                      setOtpError(null);
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* 6 Segmented PIN boxes */}
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => executeInlineVerification(code)}
                  disabled={verifyingOtp}
                  autoFocus={true}
                />

                {otpError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{otpError}</span>
                  </div>
                )}

                {otpSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{otpSuccess}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || resending}
                    className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                    <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeInlineVerification(otpCode)}
                    disabled={verifyingOtp || otpCode.trim().length !== 6}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-zinc-950 font-bold text-xs hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-cyan-500/20"
                  >
                    {verifyingOtp ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </div>
            ) : (
              /* Verify with OTP Action Line */
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-500">
                  Verify email ownership before creating account
                </span>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={sendingOtp || loading}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{sendingOtp ? "Sending code to Gmail..." : "Verify with OTP →"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300" htmlFor="register-password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-zinc-300" htmlFor="register-confirm">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="register-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-zinc-950"
              />
              <span className="text-xs text-zinc-400 leading-relaxed">
                I agree to the{" "}
                <span className="text-zinc-200 underline underline-offset-2">Terms of Service</span> and{" "}
                <span className="text-zinc-200 underline underline-offset-2">Privacy Policy</span>.
              </span>
            </label>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Alternate link to Login */}
        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <Link
            href={`/login${redirectPath !== "/account" ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}
            className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
          >
            Sign In
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

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      <AuthVisualPanel
        title="Custom 3D Printing Workflow"
        subtitle="Create an engineer profile to upload STLs, analyze wall thickness, and order precision physical parts."
      />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs font-mono">
            Loading registration portal...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
