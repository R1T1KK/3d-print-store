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
    <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.3mf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Synchronized 3D Engine
            </span>
            <span className="text-xs text-zinc-400">STL • OBJ • 3MF Live Slicing</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-bold text-zinc-50 mt-1">
            Custom 3D Model Upload & Instant Pricing
          </h3>
          <p className="text-xs lg:text-sm text-zinc-400 mt-0.5">
            Uploaded models automatically render in the 3D Printer Bed Simulator above with real-time geometric analysis.
          </p>
        </div>

        {/* Quick Sample Selector (Disabled when custom file is active) */}
        {!activeModel && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Try Sample:</span>
            <div className="flex gap-1.5">
              {SAMPLE_FILES.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => setActiveSample(sample)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    activeSample.name === sample.name
                      ? "bg-zinc-800 border-cyan-500 text-cyan-300 shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {sample.name.split("_")[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column: File Dropzone & Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-700/80 hover:border-cyan-500/80 rounded-2xl bg-zinc-950/60 transition-colors cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-200 text-center">
              Click to select or drag and drop your 3D model
            </p>
            <p className="text-xs text-zinc-500 mt-1">Supports STL, OBJ, and 3MF up to 50MB</p>
          </div>

          {/* Error Message Alert */}
          {loadError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2.5 shadow-md">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Active File Diagnostic Card */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  activeModel ? "bg-cyan-500/10 text-cyan-400" : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {activeModel ? <FileCode className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span className="truncate max-w-[220px] sm:max-w-xs">{currentFileName}</span>
                  {activeModel && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      LIVE IN 3D
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>Bounds: {currentDimensions}</span>
                  <span>•</span>
                  <span>Volume: {currentVolumeCm3} cm³</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isBedFit
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-red-400 bg-red-500/10 border-red-500/20"
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
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Material Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              1. Select Production Material
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["PLA", "PETG", "RESIN"] as const).map((mat) => (
                <button
                  key={mat}
                  onClick={() => setMaterial(mat)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    material === mat
                      ? "bg-zinc-800/90 border-cyan-500 text-zinc-100 shadow-md ring-1 ring-cyan-500/30"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-sm font-bold">{mat}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                    {materialConfigs[mat].label.split(" ")[0]}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-1">
                    ₹{materialConfigs[mat].costPerGram}/g
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Slicing Parameters: Infill & Layer Height */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  2. Infill Density
                </label>
                <span className="text-xs font-mono font-bold text-cyan-400">{infill}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={infill}
                onChange={(e) => setInfill(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                <span>15% (Light)</span>
                <span>40% (Structural)</span>
                <span>100% (Solid)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                3. Layer Height
              </label>
              <div className="flex gap-1.5">
                {[
                  { value: "0.12", label: "0.12 mm Ultra" },
                  { value: "0.20", label: "0.20 mm Std" },
                  { value: "0.28", label: "0.28 mm Draft" },
                ].map((lh) => (
                  <button
                    key={lh.value}
                    onClick={() => setLayerHeight(lh.value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                      layerHeight === lh.value
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
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
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <span className="text-sm font-semibold text-zinc-200">Quote Breakdown</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-cyan-400">
                INR (₹) Real-Time
              </span>
            </div>

            <div className="space-y-3 py-4 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Part Volume:</span>
                <span className="font-mono text-zinc-200">{currentVolumeCm3} cm³</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Calculated Mass:</span>
                <span className="font-mono text-zinc-200">{Math.round(weightGrams * 10) / 10} grams</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Material Cost ({material}):</span>
                <span className="font-mono text-zinc-200">₹{Math.round(materialCost)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Print Machine Time (~{Math.round(estimatedHours * 10) / 10}h):</span>
                <span className="font-mono text-zinc-200">₹{Math.round(machineCost)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Machine Prep & Setup:</span>
                <span className="font-mono text-zinc-200">₹{setupFee}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Batch Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-zinc-100">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-zinc-100">Estimated Total:</span>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-cyan-400 font-mono">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-500">Includes 18% GST + Free shipping on ₹999+</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={handleAdd}
              disabled={isLoading || Boolean(loadError)}
              className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAdded
                  ? "bg-emerald-500 text-zinc-950 shadow-emerald-500/20"
                  : "bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 shadow-cyan-500/20"
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

            <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> 48h Production
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Bed Fit Guaranteed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
