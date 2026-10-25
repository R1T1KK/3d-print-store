import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {children}
    </div>
  );
}

