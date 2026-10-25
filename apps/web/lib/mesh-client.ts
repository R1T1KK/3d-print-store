/**
 * HTTP client for the internal FastAPI mesh analysis service.
 * Source of Truth: SPEC.md §8, ARCHITECTURE.md §2 & SECURITY.md §3
 */

export interface MeshAnalysisResult {
  status: "VALID" | "INVALID";
  volumeMm3: number | null;
  sizeXmm: number | null;
  sizeYmm: number | null;
  sizeZmm: number | null;
  isWatertight: boolean | null;
  triangleCount: number | null;
  surfaceAreaMm2: number | null;
  issues: string[];
  meshReport: Record<string, unknown>;
}

export async function analyzeMeshViaService(
  fileUrl: string,
  fileKey?: string
): Promise<MeshAnalysisResult> {
  const meshServiceUrl = process.env.MESH_SERVICE_URL || "http://localhost:8000";
  const token = process.env.MESH_SERVICE_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token && !token.startsWith("[GENERATE-")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s client timeout

    const res = await fetch(`${meshServiceUrl}/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fileUrl,
        fileKey,
        timeoutSeconds: 15.0,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`Mesh analysis service responded with HTTP ${res.status}:`, errBody);
      return {
        status: "INVALID",
        volumeMm3: null,
        sizeXmm: null,
        sizeYmm: null,
        sizeZmm: null,
        isWatertight: null,
        triangleCount: null,
        surfaceAreaMm2: null,
        issues: [`Mesh analysis service returned HTTP ${res.status}`],
        meshReport: { error: errBody },
      };
    }

    const data = (await res.json()) as MeshAnalysisResult;
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown connection failure";
    console.error("Failed to connect to FastAPI mesh service:", errorMsg);

    return {
      status: "INVALID",
      volumeMm3: null,
      sizeXmm: null,
      sizeYmm: null,
      sizeZmm: null,
      isWatertight: null,
      triangleCount: null,
      surfaceAreaMm2: null,
      issues: [`Mesh analysis service connection error: ${errorMsg}`],
      meshReport: { error: errorMsg },
    };
  }
}
