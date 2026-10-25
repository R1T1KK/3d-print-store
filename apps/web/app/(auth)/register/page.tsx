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
  Info,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  // OTP Verification state
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
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address to receive a verification OTP.");
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
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to send verification code.");
        setSendingOtp(false);
        return;
      }

      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }
      setIsOtpMode(true);
      setResendCooldown(60);
    } catch {
      setErrorMessage("Network error while dispatching OTP. Please check your connection.");
    } finally {
      setSendingOtp(false);
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
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      if (data.devOtp) {
        setDevOtpCode(data.devOtp);
      }
      setVerificationSent(true);
      setResendCooldown(60);
      setLoading(false);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setErrorMessage("An unexpected network error occurred. Please check your connection.");
      setLoading(false);
    }
  };

  const executeVerification = async (targetOtp: string) => {
    setOtpError(null);
    setOtpSuccess(null);

    const cleanOtp = targetOtp.trim();
    if (!cleanOtp) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setOtpError("Email address is missing. Please enter your email.");
      return;
    }

    setVerifyingOtp(true);

    try {
      const supabase = createClient();

      // First try 'signup' verification type
      let { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: "signup",
      });

      // Fallback to 'email' type if 'signup' type returns error
      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: "email",
        });
        if (!retry.error) {
          data = retry.data;
          error = null;
        }
      }

      if (error) {
        setOtpError(error.message || "Invalid or expired verification code. Please check and try again.");
        setVerifyingOtp(false);
        return;
      }

      if (data?.session || data?.user) {
        setOtpSuccess("Email verified successfully! Setting up your workspace...");
        // Synchronize Supabase user into PostgreSQL Prisma database
        await fetch("/api/account/profile").catch(() => {});

        setTimeout(() => {
          router.push(redirectPath.startsWith("/") ? redirectPath : "/account");
          router.refresh();
        }, 700);
      } else {
        setOtpSuccess("Email verified! Redirecting to sign in...");
        setTimeout(() => {
          router.push(`/login?verified=true${redirectPath !== "/account" ? `&redirect=${encodeURIComponent(redirectPath)}` : ""}`);
        }, 1000);
      }
    } catch (err: unknown) {
      console.error("OTP verification error:", err);
      setOtpError("An unexpected error occurred while verifying OTP. Please try again.");
      setVerifyingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeVerification(otpCode);
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
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || "Failed to resend code.");
      } else {
        if (data.devOtp) {
          setDevOtpCode(data.devOtp);
        }
        setOtpSuccess("A new verification code has been dispatched to your email!");
        setResendCooldown(60);
      }
    } catch {
      setOtpError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
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

      {/* Main Container */}
      <div className="my-auto space-y-6">
        {verificationSent || isOtpMode ? (
          /* Email OTP Verification State */
          <div className="p-8 rounded-2xl bg-zinc-900/95 border border-zinc-800 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
              <KeyRound className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <div className="inline-block px-2.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                OTP Verification
              </div>
              <h2 className="text-xl font-bold text-zinc-50">Verify Email Address</h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Enter the verification code sent to{" "}
                <span className="font-mono text-cyan-400 font-semibold">{email || "your email"}</span>.
              </p>
            </div>

            {/* Dev Mode Instant Auto-Fill Helper */}
            {devOtpCode && (
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs text-cyan-300 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/40 text-cyan-200 tracking-wider">
                    {devOtpCode}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    (Instant Dev Code)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode(devOtpCode);
                    executeVerification(devOtpCode);
                  }}
                  className="px-2.5 py-1 rounded-md bg-cyan-500 text-zinc-950 font-bold text-[11px] hover:bg-cyan-400 transition-colors cursor-pointer"
                >
                  Auto-Fill & Verify
                </button>
              </div>
            )}

            {/* Error & Success Alerts */}
            {otpError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300 text-left animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{otpError}</div>
              </div>
            )}
            {otpSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 text-left animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{otpSuccess}</div>
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
              {!email && (
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-zinc-300" htmlFor="otp-email">
                    Confirm Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="otp-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 text-center">
                <label className="block text-xs font-semibold text-zinc-300">
                  Verification Code
                </label>
                <OtpInput
                  length={devOtpCode ? devOtpCode.length : (otpCode.length > 6 ? 8 : 6)}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => executeVerification(code)}
                  disabled={verifyingOtp}
                  autoFocus={true}
                />
                <p className="text-[11px] text-zinc-500">
                  Paste the verification code or type directly. Auto-verifies on completion.
                </p>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp || otpCode.trim().length < 6}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {verifyingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Verification Guide Box */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-left text-[11px] text-zinc-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verification Guide</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-zinc-500">
                <li>Check your Spam or Junk folder if the email does not appear in your inbox.</li>
                <li>You can also click the confirmation link in the email to verify instantly.</li>
              </ul>
            </div>

            {/* Resend & Secondary Actions */}
            <div className="pt-2 flex flex-col gap-2.5 text-xs text-zinc-400">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="inline-flex items-center justify-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold disabled:opacity-40 disabled:hover:text-cyan-400 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive code? Resend"}
              </button>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpMode(false);
                    setVerificationSent(false);
                    setOtpError(null);
                  }}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Edit registration details
                </button>
                <Link
                  href="/login"
                  className="text-zinc-400 hover:text-cyan-400 font-medium transition-colors"
                >
                  Go to Sign In →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <>
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

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2.5 text-xs text-rose-300 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
                {errorMessage.toLowerCase().includes("rate limit") && (
                  <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpMode(true);
                        setErrorMessage(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Enter 6-Digit OTP Code →
                    </button>
                    <span className="text-[11px] text-zinc-400">
                      Or disable &quot;Confirm email&quot; in Supabase Dashboard
                    </span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="arjun@example.com"
                    disabled={loading || sendingOtp}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                {/* Placed directly below Email Address */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500">
                    Already have or need an OTP code?
                  </span>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={sendingOtp || loading}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{sendingOtp ? "Sending OTP..." : "Verify with OTP →"}</span>
                  </button>
                </div>
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
                    <span className="text-zinc-200 underline underline-offset-2">Terms of Service</span>{" "}
                    and{" "}
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
          </>
        )}
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
