"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthVisualPanel from "@/components/auth/AuthVisualPanel";
import PasswordStrength, { checkPasswordStrength } from "@/components/auth/PasswordStrength";
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
  KeyRound,
  RefreshCw,
  Box,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Dispatch 6-digit password reset OTP to Gmail
  const handleSendResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

    setSendingOtp(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, purpose: "reset-password" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to dispatch reset code.");
        setSendingOtp(false);
        return;
      }

      setStep("verify");
      setResendCooldown(data.cooldown || 60);
      setSuccessMessage(`A 6-digit password reset code has been dispatched to ${cleanEmail}`);
    } catch {
      setErrorMessage("Network error while dispatching reset code. Please check your connection.");
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP and update password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
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

    setResetting(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode,
          purpose: "reset-password",
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to reset password. Please verify the code.");
        setResetting(false);
        return;
      }

      setSubmitted(true);
      setResetting(false);

      setTimeout(() => {
        router.push("/login?reset=true");
      }, 1500);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      setErrorMessage("An unexpected network error occurred. Please try again.");
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <AuthVisualPanel
        title="Account Recovery & Security"
        subtitle="Secure credential recovery. 6-digit verification codes expire in 10 minutes and protect your precision 3D CAD files."
      />

      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Top Navigation */}
        <div className="flex items-center justify-between pb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
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

        {/* Content Box */}
        <div className="my-auto space-y-6">
          {submitted ? (
            <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center space-y-5 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-zinc-50">Password Successfully Updated!</h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Your credentials for <span className="font-mono text-cyan-400 font-semibold">{email}</span> have been updated. Redirecting to login...
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/login?reset=true"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-all"
                >
                  Sign In Now
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  <KeyRound className="w-3 h-3" /> Credential Recovery
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-50">
                  Reset Your Password
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {step === "request"
                    ? "Enter your registered email address and we will dispatch a secure 6-digit verification code."
                    : "Enter the 6-digit code sent to your Gmail along with your new password."}
                </p>
              </div>

              {/* Feedback Alerts */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{successMessage}</div>
                </div>
              )}

              {/* Step 1: Request Code Form */}
              {step === "request" && (
                <form onSubmit={handleSendResetOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-300" htmlFor="recovery-email">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="recovery-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="engineer@fabric3d.io"
                        disabled={sendingOtp}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {sendingOtp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching Reset Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send 6-Digit Reset Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Verify Code & Set New Password */}
              {step === "verify" && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-400">Target email: </span>
                      <span className="font-mono text-cyan-400 font-semibold">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("request");
                        setOtpCode("");
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* 6-Digit OTP */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300 text-center">
                      Enter 6-Digit Reset Code
                    </label>
                    <OtpInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={resetting}
                      autoFocus={true}
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300" htmlFor="reset-password">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reset-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        disabled={resetting}
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

                  {/* Confirm New Password */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-300" htmlFor="confirm-reset-password">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirm-reset-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        disabled={resetting}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSendResetOtp()}
                      disabled={resendCooldown > 0 || sendingOtp}
                      className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${sendingOtp ? "animate-spin" : ""}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={resetting || otpCode.trim().length !== 6}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {resetting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-[11px] text-zinc-600 font-mono">
          Encrypted Session · TLS 1.3 · High-Precision 3D Manufacturing
        </div>
      </div>
    </div>
  );
}
