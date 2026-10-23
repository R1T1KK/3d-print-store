import assert from "node:assert";
import * as THREE from "three";
import {
  parse3DModelFile,
  calculateBufferGeometryVolume,
  MAX_FILE_SIZE_BYTES,
  PRINTER_BED_LIMITS,
} from "./lib/model-parser.ts";

console.log("=== Running 3D Model Synchronization & Parsing Tests ===");

// Helper to create mock File in Node environment
function createMockFile(name, content, type = "application/octet-stream") {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

// 1. Test Bed Dimension Constants
console.log("Test 1: Verifying Printer Bed Limits...");
assert.strictEqual(PRINTER_BED_LIMITS.widthX, 220, "Bed width must be 220mm");
assert.strictEqual(PRINTER_BED_LIMITS.depthY, 220, "Bed depth must be 220mm");
assert.strictEqual(PRINTER_BED_LIMITS.heightZ, 250, "Bed height must be 250mm");
console.log("✓ Bed limits verified (220 x 220 x 250 mm)");

// 2. Test Error Handling: Empty File (0 bytes)
console.log("\nTest 2: Testing Empty File (0 bytes) Rejection...");
try {
  const emptyFile = createMockFile("empty.stl", new Uint8Array(0));
  await parse3DModelFile(emptyFile);
  assert.fail("Should have thrown error for 0-byte file");
} catch (err) {
  assert(err.message.includes("empty (0 bytes)"), "Expected empty file error message");
  console.log("✓ Correctly rejected empty file:", err.message);
}

// 3. Test Error Handling: Unsupported Format
console.log("\nTest 3: Testing Unsupported Format Rejection...");
try {
  const textFile = createMockFile("notes.txt", "Some text");
  await parse3DModelFile(textFile);
  assert.fail("Should have thrown error for .txt extension");
} catch (err) {
  assert(err.message.includes("Unsupported file format"), "Expected format error message");
  console.log("✓ Correctly rejected unsupported format:", err.message);
}

// 4. Test Error Handling: Oversized File (>50MB)
console.log("\nTest 4: Testing Oversized File Rejection...");
assert.strictEqual(MAX_FILE_SIZE_BYTES, 50 * 1024 * 1024);
try {
  // Mock a large file without allocating 55MB in memory
  const oversizedFile = {
    name: "giant_mesh.stl",
    size: 55 * 1024 * 1024,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
  await parse3DModelFile(oversizedFile);
  assert.fail("Should have thrown error for >50MB file");
} catch (err) {
  assert(err.message.includes("exceeds the 50MB maximum"), "Expected size error message");
  console.log("✓ Correctly rejected oversized file:", err.message);
}

// 5. Test Volume Calculation on Known Geometry (20x20x20mm Cube = 8cm³)
console.log("\nTest 5: Testing Polyhedral Volume Calculation (20mm Cube = 8 cm³)...");
const cubeGeo = new THREE.BoxGeometry(20, 20, 20);
const calcVolume = calculateBufferGeometryVolume(cubeGeo);
console.log(`Calculated volume for 20x20x20mm cube: ${calcVolume} cm³ (Expected: ~8.0 cm³)`);
assert(Math.abs(calcVolume - 8.0) <= 0.2, `Volume ${calcVolume} should be approximately 8.0 cm³`);
console.log("✓ Volume calculation verified accurate");

// 6. Test Valid ASCII STL Parsing
console.log("\nTest 6: Testing Valid ASCII STL Model Parsing...");
const asciiStl = `solid test_triangle
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 0 10 0
    endloop
  endfacet
endsolid test_triangle`;

const stlFile = createMockFile("triangle.stl", asciiStl, "text/plain");
const stlResult = await parse3DModelFile(stlFile);
console.log("Parsed STL Result:", {
  fileName: stlResult.fileName,
  format: stlResult.format,
  dimensions: stlResult.dimensions,
  triangleCount: stlResult.triangleCount,
  fitsBed: stlResult.fitsBed,
});
assert.strictEqual(stlResult.fileName, "triangle.stl");
assert.strictEqual(stlResult.format, "stl");
assert.strictEqual(stlResult.fitsBed, true);
assert(Boolean(stlResult.object && stlResult.object.isObject3D));
console.log("✓ ASCII STL parsed and centered on build bed");

// 7. Test Valid OBJ Model Parsing
console.log("\nTest 7: Testing Valid OBJ Model Parsing...");
const simpleObj = `# Simple OBJ Pyramid
v 0.0 0.0 0.0
v 20.0 0.0 0.0
v 20.0 20.0 0.0
v 0.0 20.0 0.0
v 10.0 10.0 15.0
f 1 2 5
f 2 3 5
f 3 4 5
f 4 1 5
f 4 3 2 1
`;
const objFile = createMockFile("pyramid.obj", simpleObj, "text/plain");
const objResult = await parse3DModelFile(objFile);
console.log("Parsed OBJ Result:", {
  fileName: objResult.fileName,
  format: objResult.format,
  dimensions: objResult.dimensions,
  triangleCount: objResult.triangleCount,
  fitsBed: objResult.fitsBed,
});
assert.strictEqual(objResult.fileName, "pyramid.obj");
assert.strictEqual(objResult.format, "obj");
assert.strictEqual(objResult.fitsBed, true);
assert(objResult.dimensions.x > 0 && objResult.dimensions.y > 0);
console.log("✓ OBJ parsed, triangles counted, and bed oriented");

// 8. Test Bed Fit Warning (> 220mm)
console.log("\nTest 8: Testing Bed Fit Collision Warning for Oversized Geometry...");
const hugeObj = `v 0.0 0.0 0.0
v 280.0 0.0 0.0
v 280.0 50.0 0.0
f 1 2 3
`;
const hugeFile = createMockFile("oversized_part.obj", hugeObj, "text/plain");
const hugeResult = await parse3DModelFile(hugeFile);
console.log("Oversized Part Bed Fit:", hugeResult.fitsBed, "Dimensions:", hugeResult.dimensions);
assert.strictEqual(hugeResult.fitsBed, false, "Model exceeding 220mm must flag fitsBed: false");
console.log("✓ Bed fit boundary check correctly flags collision (>220mm)");

console.log("\n========================================================");
console.log("All 8 3D Model Synchronization Tests Passed Successfully!");
console.log("========================================================");
