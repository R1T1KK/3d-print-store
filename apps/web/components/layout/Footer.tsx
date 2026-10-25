import React from "react";
import { Box, Shield, Zap, Sparkles, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-800/80 pt-16 pb-12 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-zinc-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-extrabold text-zinc-100">
                FABRIC<span className="text-cyan-400">3D</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Industrial-grade on-demand 3D printing service in India. High precision FDM & SLA Resin printing, instant mesh geometric validation, and reliable doorstep dispatch within 48 hours.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bengaluru & New Delhi Hubs</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-4">
              Materials & Tech
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="hover:text-cyan-300 cursor-pointer">PLA Tough & Silk</li>
              <li className="hover:text-cyan-300 cursor-pointer">PETG Chemical & UV Resistant</li>
              <li className="hover:text-cyan-300 cursor-pointer">ABS & ASA Automotive</li>
              <li className="hover:text-cyan-300 cursor-pointer">High-Detail 8K SLA Resin</li>
              <li className="hover:text-cyan-300 cursor-pointer">TPU Flexible 95A</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-4">
              Manufacturing Standards
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400" /> 0.12mm Minimum Layer Height
              </li>
              <li className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-400" /> Automatic Manifold Check
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" /> 220 × 220 × 250mm Max Build Bed
              </li>
              <li>ISO-standard calibrated printers</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-4">
              Customer Support
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Need custom volume bulk manufacturing or CNC hybrid parts? Reach out to our engineering lab:
            </p>
            <div className="space-y-2 text-xs text-zinc-300 font-mono">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>support@fabric3d.in</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>+91 98765 43210</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© 2026 FABRIC3D Technologies. Built according to SPEC.md Architecture.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Terms & Conditions</span>
            <span className="hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-300 cursor-pointer">Manufacturing Tolerances</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
