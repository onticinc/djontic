import { NextResponse } from "next/server";
import { requireConvexAdmin } from "@/lib/convex-admin";
import {
  cloudflareImagesConfigError,
  isCloudflareImagesConfigured,
  uploadImageToCloudflare,
} from "@/lib/cloudflare-images";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const unauthorized = await requireConvexAdmin();
  if (unauthorized) return unauthorized;

  if (!isCloudflareImagesConfigured()) {
    return NextResponse.json(
      { error: cloudflareImagesConfigError() },
      { status: 503 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 10MB or smaller." },
        { status: 400 },
      );
    }

    const uploaded = await uploadImageToCloudflare(file, file.name || "photo.jpg");
    return NextResponse.json({
      ok: true,
      id: uploaded.id,
      url: uploaded.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
