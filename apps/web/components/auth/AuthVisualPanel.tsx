import { ShieldCheck, Cpu } from "lucide-react";

interface AuthVisualPanelProps {
  title?: string;
  subtitle?: string;
}

export default function AuthVisualPanel({
  title = "Additive Manufacturing Studio",
  subtitle = "Direct access to real-time slicing, deterministic INR pricing, and custom 3D build queues.",
}: AuthVisualPanelProps) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-[#050505] border-r border-white/10 p-12 overflow-hidden select-none">
      {/* Background radial gradient & engineering grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(0,0,0,0))]" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Brand Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
            <svg
              width="18"
              height="18"
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

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-white/60 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PORTAL ACTIVE</span>
        </div>
      </div>

      {/* Middle: 3D Rotating Isometric Wireframe Cube & Telemetry HUD */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-10">
        {/* 3D Perspective Stage */}
        <div className="relative w-64 h-64 flex items-center justify-center perspective-1000">
          {/* Ambient Glow */}
          <div className="absolute w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl animate-pulse-glow" />

          {/* Isometric CSS 3D Cube with Wireframe Lattice */}
          <div className="relative w-36 h-36 transform-style-3d animate-spin-3d">
            {/* Front Face */}
            <div
              className="absolute inset-0 border-2 border-emerald-400/80 bg-emerald-500/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-emerald-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-emerald-400/80">Z+</div>
            </div>

            {/* Back Face */}
            <div
              className="absolute inset-0 border-2 border-teal-500/70 bg-teal-600/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(180deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-teal-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-teal-400/80">Z-</div>
            </div>

            {/* Left Face */}
            <div
              className="absolute inset-0 border-2 border-emerald-500/70 bg-emerald-600/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(-90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-emerald-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-emerald-400/80">X-</div>
            </div>

            {/* Right Face */}
            <div
              className="absolute inset-0 border-2 border-teal-400/80 bg-teal-500/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-teal-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-teal-400/80">X+</div>
            </div>

            {/* Top Face */}
            <div
              className="absolute inset-0 border-2 border-emerald-300/80 bg-emerald-400/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateX(90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-emerald-300/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-emerald-300/80">Y+</div>
            </div>

            {/* Bottom Face */}
            <div
              className="absolute inset-0 border-2 border-zinc-800 bg-black/60 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateX(-90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-zinc-700/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-white/40">Y-</div>
            </div>
          </div>
        </div>

        {/* Telemetry readout pills */}
        <div className="mt-8 grid grid-cols-3 gap-2.5 w-full max-w-sm">
          <div className="p-3 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center">
            <span className="block text-[9px] font-mono text-white/40 uppercase">Build Volume</span>
            <span className="font-mono text-xs font-bold text-emerald-400">220×220×250</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center">
            <span className="block text-[9px] font-mono text-white/40 uppercase">Layer Res</span>
            <span className="font-mono text-xs font-bold text-white">0.12 - 0.28mm</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center">
            <span className="block text-[9px] font-mono text-white/40 uppercase">Topology QA</span>
            <span className="font-mono text-xs font-bold text-emerald-400">Watertight</span>
          </div>
        </div>

        {/* Informative Headline */}
        <div className="mt-8 text-center max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight text-white font-heading">{title}</h2>
          <p className="mt-2 text-xs text-white/50 leading-relaxed font-sans">{subtitle}</p>
        </div>
      </div>

      {/* Bottom Feature Badges */}
      <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-white/10">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-white/90 font-heading">Private S3 Storage</h4>
            <p className="text-[10px] text-white/40 font-sans">Encrypted models with signed token access</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-white/90 font-heading">Deterministic Math</h4>
            <p className="text-[10px] text-white/40 font-sans">Exact volume in cm³ & material density rates</p>
          </div>
        </div>
      </div>
    </div>
  );
}

