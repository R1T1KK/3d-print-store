import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth/admin-guard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminNavbar from "@/components/admin/AdminNavbar";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Console — FABRIC3D Studio",
  description: "Manufacturing control, custom print review, and order fulfillment portal.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  // 1. If unauthenticated, redirect to sign-in page
  if (!session.user) {
    redirect("/login?redirect=/admin");
  }

  // 2. If authenticated but role is NOT ADMIN, render secure 403 screen
  if (!session.authorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center text-zinc-100 font-sans">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6 shadow-xl shadow-rose-950/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-heading mb-2">
          Administrator Privileges Required
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
          Your account (<span className="text-zinc-200 font-mono">{session.user.email}</span>) is currently registered with Customer access permissions. Only authorized administrators may view manufacturing operations.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
          <Link
            href="/login?redirect=/admin"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Account</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-[11px] font-mono text-zinc-600">
          Security Event · IP & Session Logged
        </div>
      </div>
    );
  }

  // 3. Authorized Administrator View
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex font-sans antialiased">
      {/* Sidebar */}
      <AdminSidebar
        userEmail={session.user.email}
        userName={session.dbUser?.name || session.user.user_metadata?.name}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminNavbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
