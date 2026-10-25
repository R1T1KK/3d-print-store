/**
 * Supabase Storage manager for private custom 3D model files.
 * Source of Truth: SECURITY.md §2 & ARCHITECTURE.md §4
 *
 * Rules:
 * - Bucket 'models' is strictly PRIVATE (never public).
 * - Client uploads direct to storage via pre-signed PUT URLs.
 * - Files are downloaded exclusively via short-lived signed URLs (<= 15 minutes).
 */

import { createAdminClient } from "./admin";

export const MODELS_BUCKET = "models";
export const MAX_UPLOAD_SIZE_BYTES = 52_428_800; // 50 MB
export const ALLOWED_EXTENSIONS = [".stl", ".obj", ".3mf"];
export const ALLOWED_MIME_TYPES = [
  "model/stl",
  "application/sla",
  "model/obj",
  "application/octet-stream",
  "model/3mf",
  "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
];

let bucketEnsured = false;

/**
 * Ensures the private 'models' storage bucket exists in Supabase.
 * Executes automatically upon server startup or first upload request.
 */
export async function ensureModelsBucket(): Promise<void> {
  if (bucketEnsured) return;

  try {
    const supabase = createAdminClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    const existing = buckets?.find((b) => b.name === MODELS_BUCKET);

    if (!existing) {
      const { error } = await supabase.storage.createBucket(MODELS_BUCKET, {
        public: false,
        fileSizeLimit: MAX_UPLOAD_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });

      if (error && !error.message.toLowerCase().includes("already exists")) {
        console.warn("Storage bucket creation notice:", error.message);
      }
    }
    bucketEnsured = true;
  } catch (err: unknown) {
    console.warn("Could not verify Supabase storage bucket:", err);
  }
}

/**
 * Generates a short-lived signed upload URL for direct browser-to-bucket upload.
 */
export async function createSignedUploadUrl(
  fileKey: string
): Promise<{ signedUrl: string; token: string }> {
  await ensureModelsBucket();
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(MODELS_BUCKET)
    .createSignedUploadUrl(fileKey);

  if (error || !data) {
    throw new Error(`Failed to generate signed upload URL: ${error?.message || "Unknown storage error"}`);
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

/**
 * Generates a short-lived signed read URL for the 3D viewer or mesh analyzer (default 15 minutes).
 */
export async function createSignedReadUrl(
  fileKey: string,
  expiresInSeconds: number = 900
): Promise<string> {
  await ensureModelsBucket();
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from(MODELS_BUCKET)
    .createSignedUrl(fileKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed read URL: ${error?.message || "File inaccessible"}`);
  }

  return data.signedUrl;
}
