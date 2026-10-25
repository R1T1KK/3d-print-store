"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  ShoppingCart,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { ParsedModelResult } from "@/lib/model-parser";

interface InstantQuoteCalculatorProps {
  activeModel?: ParsedModelResult | null;
  isLoading?: boolean;
  loadError?: string | null;
  onFileUpload?: (file: File) => void;
  onClearFile?: () => void;
  onAddToCart?: (item: {
    id: string;
    title: string;
    material: string;
    color: string;
    infill: number;
    layerHeight: string;
    quantity: number;
    price: number;
    volumeCm3: number;
  }) => void;
}

const SAMPLE_FILES = [
  { name: "Robotic_Arm_Joint.stl", volumeCm3: 38.4, dimensions: "65 × 45 × 35 mm", fitsBed: true },
  { name: "Custom_Drone_Fuselage.3mf", volumeCm3: 84.2, dimensions: "180 × 140 × 40 mm", fitsBed: true },
  { name: "RaspberryPi_Enclosure.stl", volumeCm3: 29.6, dimensions: "92 × 62 × 30 mm", fitsBed: true },
];

export default function InstantQuoteCalculator({
  activeModel,
  isLoading = false,
  loadError,
  onFileUpload,
  onClearFile,
  onAddToCart,
}: InstantQuoteCalculatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSample, setActiveSample] = useState(SAMPLE_FILES[0]);
  const [material, setMaterial] = useState<"PLA" | "PETG" | "RESIN">("PLA");
  const color = "Stealth Black";
  const [infill, setInfill] = useState(25);
  const [layerHeight, setLayerHeight] = useState("0.20"); // 0.12, 0.20, 0.28 mm
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Material rates conforming to SPEC.md Section 7
  const materialConfigs = {
    PLA: { density: 1.24, costPerGram: 2.2, label: "Tough PLA (Everyday Parts)" },
    PETG: { density: 1.27, costPerGram: 2.8, label: "PETG (UV & Heat Resistant)" },
    RESIN: { density: 1.15, costPerGram: 4.5, label: "High-Detail Resin (Smooth Finish)" },
  };

  const selectedConfig = materialConfigs[material];

  // If a custom model is uploaded and valid, use its real metrics; otherwise fallback to active sample
  const currentFileName = activeModel ? activeModel.fileName : activeSample.name;
  const currentVolumeCm3 = activeModel ? activeModel.volumeCm3 : activeSample.volumeCm3;
  const currentDimensions = activeModel
    ? `${activeModel.dimensions.x} × ${activeModel.dimensions.y} × ${activeModel.dimensions.z} mm`
    : activeSample.dimensions;
  const isBedFit = activeModel ? activeModel.fitsBed : activeSample.fitsBed;

  // Slicing and pricing calculation
  const infillFactor = infill / 100;
  const effectiveInfill = 0.25 + infillFactor * 0.75;
  const weightGrams = currentVolumeCm3 * effectiveInfill * selectedConfig.density;
  const materialCost = weightGrams * selectedConfig.costPerGram;

  const layerHeightFactor = layerHeight === "0.12" ? 1.6 : layerHeight === "0.20" ? 1.0 : 0.75;
  const estimatedHours = Math.max(0.8, (currentVolumeCm3 * 0.08 + 0.5) * layerHeightFactor);

  const machineRatePerHour = 45; // ₹45/hr machine rate
  const machineCost = estimatedHours * machineRatePerHour;
  const setupFee = 50; // ₹50 setup/handling fee

  const subtotal = materialCost + machineCost + setupFee;
  const marginPct = 0.15; // 15% margin
  const minimumOrderPrice = 199; // ₹199 minimum order

  const unitPrice = Math.round(Math.max(minimumOrderPrice, subtotal * (1 + marginPct)));
  const totalPrice = unitPrice * quantity;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (onFileUpload) {
        onFileUpload(file);
      }
    }
  };

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart({
        id: `custom-${Date.now()}`,
        title: `Custom Print: ${currentFileName}`,
        material,
        color,
        infill,
        layerHeight: `${layerHeight}mm`,
        quantity,
        price: totalPrice,
        volumeCm3: currentVolumeCm3,
      });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  return (
    <div className="w-full bg-[#0a0a0a]/90 border border-white/10 rounded-3xl p-6 lg:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.3mf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
              Synchronized 3D Engine
            </span>
            <span className="text-xs text-white/50 font-mono">STL • OBJ • 3MF Live Slicing</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-bold text-white mt-2 font-heading">
            Custom 3D Model Upload & Instant Pricing
          </h3>
          <p className="text-xs lg:text-sm text-white/50 mt-1 font-sans">
            Uploaded models automatically render in the 3D Printer Bed Simulator above with real-time geometric analysis.
          </p>
        </div>

        {/* Quick Sample Selector */}
        {!activeModel && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-medium">Try Sample:</span>
            <div className="flex gap-1.5">
              {SAMPLE_FILES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => setActiveSample(sample)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all cursor-pointer ${
                    activeSample.name === sample.name
                      ? "bg-white text-black font-semibold border-white shadow-sm"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  {sample.name.split("_")[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 relative z-10">
        {/* Left Column: File Dropzone & Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/15 hover:border-emerald-500/60 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group"
          >
            <div className="p-4 rounded-full bg-white/5 border border-white/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-white/90 text-center font-heading">
              Click to select or drag and drop your 3D model
            </p>
            <p className="text-xs text-white/40 mt-1">Supports STL, OBJ, and 3MF up to 50MB</p>
          </div>

          {/* Error Message Alert */}
          {loadError && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-3 shadow-md">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Active File Diagnostic Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-2.5 rounded-xl border ${
                  activeModel
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                {activeModel ? <FileCode className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="truncate max-w-[200px] sm:max-w-xs">{currentFileName}</span>
                  {activeModel && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      LIVE IN 3D
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/50 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                  <span>Bounds: {currentDimensions}</span>
                  <span>•</span>
                  <span>Volume: {currentVolumeCm3} cm³</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border ${
                  isBedFit
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                    : "text-rose-300 bg-rose-500/10 border-rose-500/30"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isBedFit ? "Bed Fit OK" : "Exceeds 220mm"}
              </span>

              {activeModel && onClearFile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFile();
                  }}
                  title="Remove uploaded model and restore sample"
                  className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Material Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2.5 font-heading">
              1. Select Production Material
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(["PLA", "PETG", "RESIN"] as const).map((mat) => (
                <button
                  key={mat}
                  onClick={() => setMaterial(mat)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    material === mat
                      ? "bg-white/10 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                      : "bg-white/[0.02] border-white/10 text-white/60 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <div className="text-sm font-bold font-heading">{mat}</div>
                  <div className="text-[11px] text-white/50 mt-0.5 truncate font-sans">
                    {materialConfigs[mat].label.split(" ")[0]}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-1.5 font-medium">
                    ₹{materialConfigs[mat].costPerGram}/g
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Slicing Parameters: Infill & Layer Height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/60 font-heading">
                  2. Infill Density
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">{infill}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={infill}
                onChange={(e) => setInfill(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1.5 font-mono">
                <span>15% (Light)</span>
                <span>40% (Structural)</span>
                <span>100% (Solid)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10">
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2 font-heading">
                3. Layer Height
              </label>
              <div className="flex gap-1.5">
                {[
                  { value: "0.12", label: "0.12mm Ultra" },
                  { value: "0.20", label: "0.20mm Std" },
                  { value: "0.28", label: "0.28mm Draft" },
                ].map((lh) => (
                  <button
                    key={lh.value}
                    onClick={() => setLayerHeight(lh.value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      layerHeight === lh.value
                        ? "bg-white text-black font-semibold border-white shadow-sm"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Breakdown & Checkout Action */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-sm font-semibold text-white font-heading">Live Quote Breakdown</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                INR (₹) Real-Time
              </span>
            </div>

            <div className="space-y-3 py-5 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Part Volume:</span>
                <span className="font-mono text-white/90">{currentVolumeCm3} cm³</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Calculated Mass:</span>
                <span className="font-mono text-white/90">{Math.round(weightGrams * 10) / 10} grams</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Material Cost ({material}):</span>
                <span className="font-mono text-white/90">₹{Math.round(materialCost)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Print Machine Time (~{Math.round(estimatedHours * 10) / 10}h):</span>
                <span className="font-mono text-white/90">₹{Math.round(machineCost)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Machine Prep & Setup:</span>
                <span className="font-mono text-white/90">₹{setupFee}</span>
              </div>
              <div className="flex justify-between text-white/60 items-center pt-2">
                <span>Batch Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-white w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white font-heading">Estimated Total:</span>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-400 font-mono">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">Includes 18% GST + Free shipping on ₹999+</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={handleAdd}
              disabled={isLoading || Boolean(loadError)}
              className={`w-full py-4 px-6 rounded-full font-semibold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                isAdded
                  ? "bg-emerald-500 text-black shadow-emerald-500/20"
                  : "bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/30 text-black shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.01]"
              }`}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" /> Add Custom Quote to Cart
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-white/40">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> 48h Production
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Bed Fit Guaranteed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

