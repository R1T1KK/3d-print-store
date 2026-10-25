import { Box, ShieldCheck, Cpu } from "lucide-react";

interface AuthVisualPanelProps {
  title?: string;
  subtitle?: string;
}

export default function AuthVisualPanel({
  title = "Additive Manufacturing Portal",
  subtitle = "Direct access to real-time slicing, deterministic INR pricing, and custom 3D build queues.",
}: AuthVisualPanelProps) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-1/2 min-h-screen bg-zinc-950 border-r border-zinc-800/80 p-12 overflow-hidden select-none">
      {/* Background radial gradient & engineering grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-zinc-100 font-sans">
              FABRIC<span className="text-cyan-400">3D</span>
            </span>
            <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              STUDIO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PORTAL ACTIVE</span>
        </div>
      </div>

      {/* Middle: 3D Rotating Isometric Wireframe Cube & Telemetry HUD */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-10">
        {/* 3D Perspective Stage */}
        <div className="relative w-64 h-64 flex items-center justify-center perspective-1000">
          {/* Ambient Glow */}
          <div className="absolute w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl animate-pulse-glow" />

          {/* Isometric CSS 3D Cube with Wireframe Lattice */}
          <div className="relative w-36 h-36 transform-style-3d animate-spin-3d">
            {/* Front Face */}
            <div
              className="absolute inset-0 border-2 border-cyan-400/80 bg-cyan-500/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-cyan-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/80">Z+</div>
            </div>

            {/* Back Face */}
            <div
              className="absolute inset-0 border-2 border-blue-500/70 bg-blue-600/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(180deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-blue-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-blue-400/80">Z-</div>
            </div>

            {/* Left Face */}
            <div
              className="absolute inset-0 border-2 border-cyan-500/70 bg-cyan-600/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(-90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-cyan-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-cyan-400/80">X-</div>
            </div>

            {/* Right Face */}
            <div
              className="absolute inset-0 border-2 border-blue-400/80 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateY(90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-blue-400/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-blue-400/80">X+</div>
            </div>

            {/* Top Face */}
            <div
              className="absolute inset-0 border-2 border-cyan-300/80 bg-cyan-400/10 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateX(90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-cyan-300/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-cyan-300/80">Y+</div>
            </div>

            {/* Bottom Face */}
            <div
              className="absolute inset-0 border-2 border-zinc-700 bg-zinc-900/60 backdrop-blur-[2px] flex items-center justify-center"
              style={{ transform: "rotateX(-90deg) translateZ(72px)" }}
            >
              <div className="w-12 h-12 border border-zinc-600/40 rounded-sm" />
              <div className="absolute top-1 left-1 text-[8px] font-mono text-zinc-400">Y-</div>
            </div>
          </div>
        </div>

        {/* Telemetry readout pills */}
        <div className="mt-8 grid grid-cols-3 gap-2 w-full max-w-sm">
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <span className="block text-[9px] font-mono text-zinc-400 uppercase">Build Volume</span>
            <span className="font-mono text-xs font-bold text-cyan-400">220×220×250</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <span className="block text-[9px] font-mono text-zinc-400 uppercase">Layer Res</span>
            <span className="font-mono text-xs font-bold text-zinc-100">0.12 - 0.28mm</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-center">
            <span className="block text-[9px] font-mono text-zinc-400 uppercase">Slicer Engine</span>
            <span className="font-mono text-xs font-bold text-emerald-400">Manifold OK</span>
          </div>
        </div>

        {/* Informative Headline */}
        <div className="mt-8 text-center max-w-sm">
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">{title}</h2>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      {/* Bottom Feature Badges */}
      <div className="relative z-10 grid grid-cols-2 gap-3 pt-6 border-t border-zinc-800/60">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Private S3 Model Storage</h4>
            <p className="text-[10px] text-zinc-400">Models stored in encrypted buckets with signed access</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Deterministic Slicing</h4>
            <p className="text-[10px] text-zinc-400">Exact volume in cm³ & density-based INR calculation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
