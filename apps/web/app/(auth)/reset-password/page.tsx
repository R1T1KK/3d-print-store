"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthVisualPanel from "@/components/auth/AuthVisualPanel";
import PasswordStrength, { checkPasswordStrength } from "@/components/auth/PasswordStrength";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Box,
} from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const strength = checkPasswordStrength(password);
    if (!strength.meetsLength) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (strength.score < 2) {
      setErrorMessage("Please choose a stronger password containing numbers or uppercase characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMessage(
          error.message || "Unable to update password. Your reset link may have expired."
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login?reset=true");
      }, 1500);
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      setErrorMessage("An unexpected error occurred. Please try requesting a new reset link.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <AuthVisualPanel
        title="Update Security Credentials"
        subtitle="Choose a high-entropy password to secure your CAD files, quotes, and delivery details."
      />

      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Top Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-100 font-heading">
              FABRIC<span className="text-emerald-400">3D</span>
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="my-auto space-y-6 py-6">
          {success ? (
            <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-4 animate-in fade-in zoom-in-95 backdrop-blur-md">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white font-heading">Password Updated!</h2>
                <p className="text-xs text-zinc-400">
                  Your credentials have been securely updated. Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                  <KeyRound className="w-3 h-3" /> Set New Credentials
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-heading">
                  Reset Account Password
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Enter and confirm your new password below.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={loading}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
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
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-300" htmlFor="confirm-new-password">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="confirm-new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-6 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
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
