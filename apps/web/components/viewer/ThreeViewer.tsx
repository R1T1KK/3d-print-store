"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  RotateCw,
  Box,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import {
  ParsedModelResult,
  disposeThreeObject,
  PRINTER_BED_LIMITS,
} from "@/lib/model-parser";

interface ModelPreset {
  id: string;
  name: string;
  category: string;
  dimensions: { x: number; y: number; z: number };
  volumeCm3: number;
  printTimeHours: number;
}

const PRESETS: ModelPreset[] = [
  {
    id: "gear",
    name: "Helical Planetary Gear",
    category: "Functional Mechanics",
    dimensions: { x: 74, y: 74, z: 28 },
    volumeCm3: 42.5,
    printTimeHours: 3.2,
  },
  {
    id: "vase",
    name: "Voronoi Hex Vase",
    category: "Art & Decor",
    dimensions: { x: 88, y: 88, z: 140 },
    volumeCm3: 68.0,
    printTimeHours: 5.5,
  },
  {
    id: "bracket",
    name: "Aerospace Structural Mount",
    category: "Engineering",
    dimensions: { x: 110, y: 55, z: 45 },
    volumeCm3: 56.2,
    printTimeHours: 4.1,
  },
  {
    id: "cube",
    name: "XYZ Calibration Block",
    category: "Diagnostics",
    dimensions: { x: 30, y: 30, z: 30 },
    volumeCm3: 27.0,
    printTimeHours: 1.8,
  },
];

const COLOR_OPTIONS = [
  { name: "Prusa Orange", hex: "#f85b00", material: "PLA" },
  { name: "Stealth Black", hex: "#18181b", material: "PLA" },
  { name: "Cyber Cyan", hex: "#06b6d4", material: "PETG" },
  { name: "Gunmetal Gray", hex: "#475569", material: "PLA Tough" },
  { name: "Signal Red", hex: "#ef4444", material: "PETG" },
  { name: "Pearl White", hex: "#f1f5f9", material: "Resin" },
];

interface ThreeViewerProps {
  activeModel?: ParsedModelResult | null;
  isLoading?: boolean;
  loadError?: string | null;
  onClearCustomModel?: () => void;
  onTriggerUploadClick?: () => void;
}

export default function ThreeViewer({
  activeModel,
  isLoading = false,
  loadError,
  onClearCustomModel,
  onTriggerUploadClick,
}: ThreeViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<ModelPreset>(PRESETS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const autoRotateRef = useRef<boolean>(isAutoRotate);

  // Sync auto-spin state to controls and render loop without re-initializing the scene
  useEffect(() => {
    autoRotateRef.current = isAutoRotate;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Fullscreen toggle handler (HTML5 Fullscreen API + CSS fallback)
  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement && !isFullscreen) {
      try {
        if (wrapperRef.current.requestFullscreen) {
          await wrapperRef.current.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request failed, using CSS fallback:", err);
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.warn("Exit fullscreen failed:", err);
        }
      }
      setIsFullscreen(false);
    }
  };

  // Listen for native fullscreen changes & Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isNativeFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // 1. Initialize Scene, Camera, Bed & Controls (runs ONCE on mount)
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#09090b");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(130, 100, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    renderer.domElement.style.touchAction = "none";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Restrict below-bed view
    controls.minDistance = 30;
    controls.maxDistance = 450;
    controls.target.set(0, 25, 0);
    controls.autoRotate = autoRotateRef.current;
    controls.autoRotateSpeed = 1.6;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight1.position.set(100, 150, 90);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-100, 80, -90);
    scene.add(rimLight);

    // 220mm x 220mm Simulated 3D Printer Bed
    const bedGroup = new THREE.Group();

    const bedGeo = new THREE.BoxGeometry(
      PRINTER_BED_LIMITS.widthX,
      4,
      PRINTER_BED_LIMITS.depthY
    );
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.3,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.y = -2;
    bedMesh.receiveShadow = true;
    bedGroup.add(bedMesh);

    // Bed Grid
    const grid = new THREE.GridHelper(
      PRINTER_BED_LIMITS.widthX,
      22,
      0x06b6d4,
      0x27272a
    );
    grid.position.y = 0.1;
    bedGroup.add(grid);

    // Bed Boundary Outline
    const outlineGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(PRINTER_BED_LIMITS.widthX, 0.1, PRINTER_BED_LIMITS.depthY)
    );
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    const outline = new THREE.LineSegments(outlineGeo, outlineMat);
    outline.position.y = 0.2;
    bedGroup.add(outline);

    scene.add(bedGroup);

    // Mesh Container Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.autoRotateSpeed = 1.6;
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    // ResizeObserver ensures instantaneous, pixel-perfect canvas sizing across fullscreen & layout shifts
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (meshGroupRef.current) {
        disposeThreeObject(meshGroupRef.current);
      }
      bedGeo.dispose();
      bedMat.dispose();
      grid.dispose();
      outlineGeo.dispose();
      outlineMat.dispose();
      renderer.dispose();
    };
  }, []);

  // 2. Render Active Model (Custom Uploaded vs Preset Sample)
  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Cleanly dispose prior geometries and materials before clearing
    disposeThreeObject(group);
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(selectedColor.hex),
      roughness: selectedColor.material === "PETG" ? 0.25 : 0.65,
      metalness: selectedColor.material === "Resin" ? 0.1 : 0.2,
      wireframe: isWireframe,
      flatShading: false,
    });

    // CASE A: Customer Uploaded Model is active
    if (activeModel && activeModel.object) {
      // Clone wrapper to allow independent material assignment
      const clone = activeModel.object.clone(true);

      // Apply material and wireframe to all submeshes
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.material = mat;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      group.add(clone);

      // Frame camera to comfortably view the uploaded model without distortion
      if (cameraRef.current && controlsRef.current) {
        const maxDim = Math.max(
          activeModel.dimensions.x,
          activeModel.dimensions.y,
          activeModel.dimensions.z
        );
        const targetDist = Math.max(110, maxDim * 2.2);
        cameraRef.current.position.set(
          targetDist * 0.8,
          targetDist * 0.7,
          targetDist * 0.9
        );
        controlsRef.current.target.set(0, Math.min(60, activeModel.dimensions.z / 2), 0);
        controlsRef.current.update();
      }
      return;
    }

    // CASE B: Built-in Sample Presets
    if (selectedPreset.id === "gear") {
      const outerRing = new THREE.CylinderGeometry(34, 34, 18, 36);
      const mainMesh = new THREE.Mesh(outerRing, mat);
      mainMesh.castShadow = true;
      mainMesh.receiveShadow = true;
      mainMesh.position.y = 9;

      const teethGroup = new THREE.Group();
      teethGroup.add(mainMesh);

      for (let i = 0; i < 16; i++) {
        const toothGeo = new THREE.BoxGeometry(8, 18, 6);
        const tooth = new THREE.Mesh(toothGeo, mat);
        const angle = (i / 16) * Math.PI * 2;
        tooth.position.set(Math.cos(angle) * 35, 9, Math.sin(angle) * 35);
        tooth.rotation.y = -angle;
        tooth.castShadow = true;
        teethGroup.add(tooth);
      }

      const centerShaft = new THREE.CylinderGeometry(10, 10, 24, 24);
      const centerMesh = new THREE.Mesh(centerShaft, mat);
      centerMesh.position.y = 12;
      teethGroup.add(centerMesh);

      group.add(teethGroup);
    } else if (selectedPreset.id === "vase") {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const radius = 18 + Math.sin(t * Math.PI * 3) * 12 + t * 14;
        const y = t * 110;
        points.push(new THREE.Vector2(radius, y));
      }
      const geometry = new THREE.LatheGeometry(points, 42);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    } else if (selectedPreset.id === "bracket") {
      const baseGeo = new THREE.BoxGeometry(90, 12, 45);
      const uprightGeo = new THREE.BoxGeometry(14, 55, 45);

      const bMesh = new THREE.Mesh(baseGeo, mat);
      bMesh.position.set(0, 6, 0);
      bMesh.castShadow = true;

      const uMesh = new THREE.Mesh(uprightGeo, mat);
      uMesh.position.set(-38, 32, 0);
      uMesh.castShadow = true;

      const bracketGroup = new THREE.Group();
      bracketGroup.add(bMesh);
      bracketGroup.add(uMesh);

      group.add(bracketGroup);
    } else {
      const geometry = new THREE.BoxGeometry(30, 30, 30);
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.y = 15;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }, [selectedPreset, selectedColor, isWireframe, activeModel]);

  const resetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(130, 100, 140);
      controlsRef.current.target.set(0, 25, 0);
      controlsRef.current.update();
    }
  };

  const currentName = activeModel ? activeModel.fileName : selectedPreset.name;
  const currentDims = activeModel
    ? activeModel.dimensions
    : selectedPreset.dimensions;
  const currentVolume = activeModel
    ? activeModel.volumeCm3
    : selectedPreset.volumeCm3;
  const isBedFit = activeModel ? activeModel.fitsBed : true;

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-screen rounded-none bg-[#050505]"
          : "w-full h-[580px] lg:h-[680px] rounded-3xl overflow-hidden border border-white/10 bg-[#080808] shadow-2xl backdrop-blur-md"
      }`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <h4 className="text-sm font-semibold text-white font-heading">Parsing 3D Mesh Geometry...</h4>
          <p className="text-xs text-white/50 mt-1 font-sans">Analyzing vertices, bounding box & bed fit</p>
        </div>
      )}


      {/* Error Alert Banner */}
      {loadError && (
        <div className="absolute top-16 left-4 right-4 z-20 p-3 rounded-xl bg-red-950/90 border border-red-800 text-red-200 text-xs flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{loadError}</span>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-b from-zinc-950/90 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Interactive 3D WebGL
          </div>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            Print Bed: {PRINTER_BED_LIMITS.widthX} × {PRINTER_BED_LIMITS.depthY} × {PRINTER_BED_LIMITS.heightZ} mm
          </span>
        </div>

        {/* Fullscreen Exit Pill or Model Selector / Custom Status Pill */}
        <div className="flex items-center gap-2">
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 shadow-lg cursor-pointer transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exit Fullscreen</span>
              <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">ESC</kbd>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            {activeModel ? (
              <div className="flex items-center gap-2 px-2 py-0.5">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Custom: {activeModel.fileName.slice(0, 16)}...</span>
                </span>
                <button
                  onClick={onClearCustomModel}
                  title="Reset to Sample Models"
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Sample</span>
                </button>
              </div>
            ) : (
              PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                    selectedPreset.id === preset.id
                      ? "bg-zinc-100 text-zinc-950 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  }`}
                >
                  {preset.name.split(" ")[0]}
                </button>
              ))
            )}

            {onTriggerUploadClick && (
              <button
                onClick={onTriggerUploadClick}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all"
              >
                <UploadCloud className="w-3 h-3" />
                <span>Upload Model</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing flex-1" />

      {/* Floating HUD Badges & Diagnostics */}
      <div className="absolute top-18 left-4 z-10 space-y-2 pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/90 p-3.5 rounded-xl shadow-xl pointer-events-auto max-w-[270px]">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100 truncate">
            {activeModel ? (
              <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
            ) : (
              <Box className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="truncate">{currentName}</span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-zinc-400">
            <div>Dimensions:</div>
            <div className="font-mono text-zinc-100 text-right">
              {currentDims.x} × {currentDims.y} × {currentDims.z} mm
            </div>
            <div>Volume:</div>
            <div className="font-mono text-zinc-100 text-right">{currentVolume} cm³</div>
            <div>Bed Fit:</div>
            <div
              className={`font-mono text-right font-semibold ${
                isBedFit ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isBedFit ? "100% Fit OK" : "Exceeds Bed!"}
            </div>
            {activeModel && (
              <>
                <div>Triangles:</div>
                <div className="font-mono text-zinc-300 text-right">
                  {activeModel.triangleCount.toLocaleString()}
                </div>
              </>
            )}
          </div>

          {activeModel && (
            <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 uppercase font-mono">Format: .{activeModel.format}</span>
              <span
                className={`font-semibold flex items-center gap-1 ${
                  isBedFit ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isBedFit ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Ready to Print
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" /> Resize Required
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl">
        {/* Filament / Material Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Material:
          </span>
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedColor(c)}
                title={`${c.name} (${c.material})`}
                aria-label={`Select ${c.name} (${c.material}) filament`}
                className={`w-6 h-6 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  selectedColor.name === c.name
                    ? "scale-115 border-white shadow-md ring-2 ring-cyan-500/50"
                    : "border-zinc-700 hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {selectedColor.material}
          </span>
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWireframe(!isWireframe)}
            aria-label={isWireframe ? "Disable wireframe mesh mode" : "Enable wireframe mesh mode"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isWireframe
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Wireframe
          </button>

          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            aria-label={isAutoRotate ? "Pause turntable auto-rotation" : "Start turntable auto-rotation"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isAutoRotate
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            Auto-Spin
          </button>

          <button
            onClick={resetCamera}
            title="Reset Camera View"
            aria-label="Reset camera orientation to default isometric angle"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset View</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen view" : "Enter fullscreen view"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isFullscreen
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
                : "bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
