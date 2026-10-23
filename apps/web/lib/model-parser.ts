import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const PRINTER_BED_LIMITS = {
  widthX: 220,  // mm
  depthY: 220,  // mm
  heightZ: 250, // mm
} as const;

export interface ParsedModelResult {
  fileName: string;
  fileSizeBytes: number;
  format: "stl" | "obj" | "3mf";
  dimensions: { x: number; y: number; z: number }; // mm
  volumeCm3: number;
  triangleCount: number;
  fitsBed: boolean;
  object: THREE.Object3D;
}

/**
 * Computes exact signed tetrahedron volume for BufferGeometry.
 * Works for both indexed and non-indexed geometries.
 */
export function calculateBufferGeometryVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  if (!position || position.count === 0) return 0;

  let totalVolume = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const index = geometry.index;
  if (index) {
    const idxCount = index.count;
    for (let i = 0; i < idxCount; i += 3) {
      p1.fromBufferAttribute(position, index.getX(i));
      p2.fromBufferAttribute(position, index.getX(i + 1));
      p3.fromBufferAttribute(position, index.getX(i + 2));
      cross.crossVectors(p2, p3);
      totalVolume += p1.dot(cross) / 6.0;
    }
  } else {
    const count = position.count;
    for (let i = 0; i < count; i += 3) {
      p1.fromBufferAttribute(position, i);
      p2.fromBufferAttribute(position, i + 1);
      p3.fromBufferAttribute(position, i + 2);
      cross.crossVectors(p2, p3);
      totalVolume += p1.dot(cross) / 6.0;
    }
  }

  const volCm3 = Math.abs(totalVolume) / 1000.0;
  return Math.round(volCm3 * 10) / 10;
}

/**
 * Recursively disposes geometries, materials and textures in a Three.js hierarchy.
 */
export function disposeThreeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  });
}

/**
 * Validates, loads, centers, and analyzes STL, OBJ, or 3MF file client-side.
 */
export async function parse3DModelFile(file: File): Promise<ParsedModelResult> {
  // 1. Validation: File Existence & Size
  if (!file) {
    throw new Error("No file provided.");
  }
  if (file.size === 0) {
    throw new Error(`File "${file.name}" is empty (0 bytes). Please upload a valid 3D model.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB maximum size limit.`
    );
  }

  // 2. Validation: Format Extension
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext !== "stl" && ext !== "obj" && ext !== "3mf") {
    throw new Error(
      `Unsupported file format ".${ext || "unknown"}". Supported formats: .stl, .obj, .3mf.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  // 3. Parsing by Format
  let loadedObject: THREE.Object3D;
  let totalTriangles = 0;
  let totalVolumeCm3 = 0;

  if (ext === "stl") {
    const loader = new STLLoader();
    const geometry = loader.parse(arrayBuffer);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry);
    loadedObject = mesh;

    totalTriangles = geometry.attributes.position ? geometry.attributes.position.count / 3 : 0;
    totalVolumeCm3 = calculateBufferGeometryVolume(geometry);
  } else if (ext === "obj") {
    const textDecoder = new TextDecoder("utf-8");
    const text = textDecoder.decode(arrayBuffer);
    const loader = new OBJLoader();
    const group = loader.parse(text);

    let hasMeshes = false;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        hasMeshes = true;
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
          const triCount = (mesh.geometry.index
            ? mesh.geometry.index.count
            : mesh.geometry.attributes.position?.count || 0) / 3;
          totalTriangles += triCount;
          totalVolumeCm3 += calculateBufferGeometryVolume(mesh.geometry);
        }
      }
    });

    if (!hasMeshes || totalTriangles === 0) {
      throw new Error(`The OBJ file "${name}" contains no valid polygonal geometry.`);
    }

    loadedObject = group;
  } else if (ext === "3mf") {
    const loader = new ThreeMFLoader();
    const group = loader.parse(arrayBuffer);

    let hasMeshes = false;
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        hasMeshes = true;
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.computeVertexNormals();
          const triCount = (mesh.geometry.index
            ? mesh.geometry.index.count
            : mesh.geometry.attributes.position?.count || 0) / 3;
          totalTriangles += triCount;
          totalVolumeCm3 += calculateBufferGeometryVolume(mesh.geometry);
        }
      }
    });

    if (!hasMeshes || totalTriangles === 0) {
      throw new Error(`The 3MF file "${name}" contains no readable 3D mesh components.`);
    }

    loadedObject = group;
  } else {
    throw new Error(`Unsupported format: ${ext}`);
  }

  // 4. Centering & Bed Orientation
  // Compute true bounding box without modifying proportions
  const initialBox = new THREE.Box3().setFromObject(loadedObject);
  if (initialBox.isEmpty()) {
    throw new Error(`Uploaded file "${name}" has an empty bounding box.`);
  }

  const size = new THREE.Vector3();
  initialBox.getSize(size);

  const center = new THREE.Vector3();
  initialBox.getCenter(center);

  // Wrapper group to position bottom exactly on printer bed surface (y = 0)
  const wrapper = new THREE.Group();
  wrapper.name = `custom-model-${name}`;

  // Center horizontally (X, Z) and sit on bottom (Y)
  loadedObject.position.x -= center.x;
  loadedObject.position.z -= center.z;
  loadedObject.position.y -= initialBox.min.y;

  wrapper.add(loadedObject);

  const dimX = Math.round(size.x * 10) / 10;
  const dimY = Math.round(size.z * 10) / 10; // bed depth (Z in Three.js)
  const dimZ = Math.round(size.y * 10) / 10; // bed height (Y in Three.js)

  // Bed fit validation: 220 x 220 x 250 mm
  const fitsBed =
    dimX <= PRINTER_BED_LIMITS.widthX &&
    dimY <= PRINTER_BED_LIMITS.depthY &&
    dimZ <= PRINTER_BED_LIMITS.heightZ;

  // Fallback volume if polyhedral formula yields zero (e.g. non-closed surfaces)
  const finalVolume =
    totalVolumeCm3 > 0
      ? Math.round(totalVolumeCm3 * 10) / 10
      : Math.round(((dimX * dimY * dimZ * 0.35) / 1000) * 10) / 10;

  return {
    fileName: name,
    fileSizeBytes: file.size,
    format: ext,
    dimensions: { x: dimX, y: dimY, z: dimZ },
    volumeCm3: Math.max(0.5, finalVolume),
    triangleCount: Math.round(totalTriangles),
    fitsBed,
    object: wrapper,
  };
}
