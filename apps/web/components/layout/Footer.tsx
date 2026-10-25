import React from "react";
import { Shield, Zap, Sparkles, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#050505] border-t border-white/10 pt-20 pb-12 mt-32 relative overflow-hidden">
      {/* Background ambient emerald glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-950/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-white/10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="text-[17px] font-semibold tracking-[-0.02em] text-white font-heading">
                FABRIC<span className="text-emerald-400 font-bold">3D</span>
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Precision additive manufacturing & on-demand engineering service. Instant mesh volume validation, industrial FDM & Resin printing, and doorstep dispatch in 48 hours.
            </p>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bengaluru & New Delhi Hubs</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4 font-heading">
              Materials & Tech
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60 font-sans">
              <li className="hover:text-emerald-300 transition-colors cursor-pointer">PLA Tough & Silk</li>
              <li className="hover:text-emerald-300 transition-colors cursor-pointer">PETG Chemical Resistant</li>
              <li className="hover:text-emerald-300 transition-colors cursor-pointer">ABS & ASA Automotive</li>
              <li className="hover:text-emerald-300 transition-colors cursor-pointer">High-Detail 8K SLA Resin</li>
              <li className="hover:text-emerald-300 transition-colors cursor-pointer">TPU Flexible 95A</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4 font-heading">
              Manufacturing Standards
            </h4>
            <ul className="space-y-2.5 text-xs text-white/60 font-sans">
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> 0.12mm Layer Resolution
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Manifold Topology Checks
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 220 × 220 × 250mm Build Volume
              </li>
              <li className="text-white/40">ISO-calibrated precision printers</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/90 mb-4 font-heading">
              Direct Contact
            </h4>
            <p className="text-xs text-white/50 leading-relaxed mb-3 font-sans">
              Have enterprise volume orders or special aerospace tolerances? Connect with our team:
            </p>
            <div className="space-y-2 text-xs text-white/80 font-mono">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>support@fabric3d.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>+91 98765 43210</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
          <p>© 2026 FABRIC3D Technologies. Engineered with precision.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Tolerances</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

