"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import {
  RotateCcw,
  Layers,
  Box,
  RotateCw,
  AlertCircle,
} from "lucide-react";
import {
  PRINTER_BED_LIMITS,
  disposeThreeObject,
} from "@/lib/model-parser";

interface AdminMeshViewerProps {
  modelId: string;
  fileName: string;
  dimensions?: { x?: number | null; y?: number | null; z?: number | null };
}

export default function AdminMeshViewer({
  modelId,
  fileName,
  dimensions,
}: AdminMeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [triangleCount, setTriangleCount] = useState<number | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  // Toggle wireframe mode
  useEffect(() => {
    if (!meshGroupRef.current) return;
    meshGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if ("wireframe" in mat) {
              (mat as THREE.MeshStandardMaterial).wireframe = isWireframe;
            }
          });
        } else if (mesh.material && "wireframe" in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
        }
      }
    });
  }, [isWireframe]);

  // Toggle auto rotation
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotate;
    }
  }, [isAutoRotate]);

  // Reset camera view
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(180, 180, 220);
    controlsRef.current.target.set(0, 30, 0);
    controlsRef.current.update();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    let isDisposed = false;
    let animationFrameId: number;

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 340;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090a0f); // bg-zinc-950
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(180, 180, 220);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.touchAction = "none";
    containerRef.current.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;
    controls.maxDistance = 600;
    controls.minDistance = 20;
    controls.target.set(0, 30, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.2); // Cyan key light
    dirLight1.position.set(150, 200, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-150, 100, -150);
    scene.add(dirLight2);

    // 6. Build Plate Simulator (220 x 220 mm)
    const bedWidth = PRINTER_BED_LIMITS.widthX;
    const bedDepth = PRINTER_BED_LIMITS.depthY;
    const grid = new THREE.GridHelper(bedWidth, 22, 0x06b6d4, 0x27272a);
    grid.position.y = 0;
    scene.add(grid);

    // Bed wireframe box
    const boxGeometry = new THREE.BoxGeometry(bedWidth, PRINTER_BED_LIMITS.heightZ, bedDepth);
    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
    const boxLines = new THREE.LineSegments(
      boxEdges,
      new THREE.LineBasicMaterial({ color: 0x3f3f46, transparent: true, opacity: 0.35 })
    );
    boxLines.position.y = PRINTER_BED_LIMITS.heightZ / 2;
    scene.add(boxLines);

    // Group for the model
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // 7. Load model from secure download endpoint
    async function loadMesh() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/models/${modelId}/download`);
        if (!res.ok) {
          throw new Error("Unable to fetch secure 3D model signed URL.");
        }

        const data = await res.json();
        const signedUrl = data.signedUrl;

        const ext = fileName.toLowerCase().split(".").pop();

        if (ext === "stl") {
          const loader = new STLLoader();
          const geometry = await loader.loadAsync(signedUrl);
          if (isDisposed) return;

          geometry.computeVertexNormals();
          geometry.center();

          const triCount = geometry.attributes.position.count / 3;
          setTriangleCount(Math.round(triCount));

          const material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            roughness: 0.3,
            metalness: 0.2,
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Compute bounding box and seat on bed
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            const size = new THREE.Vector3();
            geometry.boundingBox.getSize(size);
            mesh.position.y = size.y / 2;
          }

          meshGroup.add(mesh);
        } else if (ext === "obj") {
          const loader = new OBJLoader();
          const obj = await loader.loadAsync(signedUrl);
          if (isDisposed) return;

          let tris = 0;
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.material = new THREE.MeshStandardMaterial({
                color: 0x06b6d4,
                roughness: 0.3,
                metalness: 0.2,
              });
              if (m.geometry) {
                tris += m.geometry.attributes.position.count / 3;
              }
            }
          });
          setTriangleCount(Math.round(tris));

          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          obj.position.x = -center.x;
          obj.position.z = -center.z;
          obj.position.y = size.y / 2;

          meshGroup.add(obj);
        } else {
          throw new Error(`Viewer preview for .${ext} is in conversion.`);
        }
      } catch (err: unknown) {
        if (!isDisposed) {
          console.warn("Could not load 3D mesh for inspection:", err);
          setError("3D mesh preview unavailable or file key expired. Check diagnostics table.");
        }
      } finally {
        if (!isDisposed) setLoading(false);
      }
    }

    loadMesh();

    // Render loop
    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      disposeThreeObject(scene);
      renderer.dispose();
    };
  }, [modelId, fileName]);

  return (
    <div className="relative w-full h-[360px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-zinc-400 z-10">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-mono">Loading 3D Mesh Geometry...</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && !loading && (
        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center text-zinc-400 p-6 text-center z-10">
          <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
          <p className="text-xs font-medium text-zinc-300">{error}</p>
          <span className="text-[11px] text-zinc-500 font-mono mt-1">
            Build bed telemetry & diagnostics remain fully accessible below.
          </span>
        </div>
      )}

      {/* Floating Viewport Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        <button
          onClick={() => setIsWireframe(!isWireframe)}
          className={`p-2 rounded-lg text-xs border transition-colors ${
            isWireframe
              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border-zinc-800"
          }`}
          title="Toggle Wireframe Triangulation"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className={`p-2 rounded-lg text-xs border transition-colors ${
            isAutoRotate
              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
              : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border-zinc-800"
          }`}
          title="Toggle Turntable Rotation"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-2 rounded-lg text-xs bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Telemetry Badge (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/80 text-[10px] font-mono text-zinc-300 flex items-center gap-3 z-20">
        <div className="flex items-center gap-1.5">
          <Box className="w-3 h-3 text-cyan-400" />
          <span>
            {dimensions?.x ? `${dimensions.x} × ${dimensions.y} × ${dimensions.z} mm` : "220 × 220 Bed"}
          </span>
        </div>
        {triangleCount !== null && (
          <div className="border-l border-zinc-800 pl-2 text-zinc-400">
            {triangleCount.toLocaleString()} triangles
          </div>
        )}
      </div>
    </div>
  );
}
