import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSignedUploadUrl,
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
} from "@/lib/supabase/storage";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate customer session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to upload custom 3D models." },
        { status: 401 }
      );
    }

    // 2. Parse and validate upload metadata
    const body = await request.json().catch(() => null);
    if (!body || !body.fileName || typeof body.fileName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'fileName' in request body." },
        { status: 400 }
      );
    }

    const fileName = body.fileName.trim();
    const fileSize = Number(body.fileSize);

    // File size check (<= 50 MB)
    if (!fileSize || isNaN(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "Invalid file size. File cannot be empty." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds maximum upload size of 50 MB (${MAX_UPLOAD_SIZE_BYTES.toLocaleString()} bytes).`,
        },
        { status: 400 }
      );
    }

    // Extension whitelist (.stl, .obj, .3mf)
    const lowerName = fileName.toLowerCase();
    const matchedExt = ALLOWED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));
    if (!matchedExt) {
      return NextResponse.json(
        {
          error: `Unsupported file format. Only ${ALLOWED_EXTENSIONS.join(", ")} are accepted.`,
        },
        { status: 400 }
      );
    }

    // 3. Generate randomized, secure private storage key
    // Pattern: models/{userId}/{timestamp}-{uuid}.{ext}
    const sanitizedBase = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 32);

    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const fileKey = `models/${user.id}/${Date.now()}-${sanitizedBase}-${randomSuffix}${matchedExt}`;

    // 4. Generate short-lived signed upload URL from Supabase Storage
    const { signedUrl, token } = await createSignedUploadUrl(fileKey);

    return NextResponse.json({
      signedUploadUrl: signedUrl,
      fileKey,
      token,
      expiresIn: 900, // 15 minutes
    });
  } catch (err: unknown) {
    console.error("Upload signing error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while preparing secure upload." },
      { status: 500 }
    );
  }
}
