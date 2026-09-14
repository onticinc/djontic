import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { getMixById } from "@/lib/mixes";
import {
  extractAndCacheArtwork,
  readCachedArtwork,
} from "@/lib/mix-media";
import { resolveCoverFetchUrl } from "@/lib/mix-types";

type Params = { params: Promise<{ id: string }> };

const DEFAULT_COVER = path.join(
  process.cwd(),
  "public",
  "images",
  "default-cover-art.png",
);

async function defaultCoverResponse() {
  const buffer = await fs.readFile(DEFAULT_COVER);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function sniffContentType(buffer: Buffer, fallback: string) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return "image/webp";
  }
  if (fallback.startsWith("image/")) return fallback;
  return "image/jpeg";
}

async function fetchCoverImage(coverUrl: string) {
  const fetchUrl = resolveCoverFetchUrl(coverUrl);
  const response = await fetch(fetchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Cover fetch failed (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const upstreamType = response.headers.get("content-type") || "";
  if (upstreamType.includes("text/html") || buffer.slice(0, 15).toString("utf8").includes("<!DOCTYPE")) {
    throw new Error("Cover URL returned HTML instead of an image");
  }

  return {
    buffer,
    contentType: sniffContentType(buffer, upstreamType),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return new Response("Not found", { status: 404 });
  }

  // Manual cover link from admin takes priority over ID3 / default.
  if (found.mix.coverUrl) {
    try {
      const { buffer, contentType } = await fetchCoverImage(found.mix.coverUrl);
      const etag = createHash("sha1").update(found.mix.coverUrl).digest("hex").slice(0, 16);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          ETag: `"${etag}"`,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (error) {
      console.error("Cover URL fetch error:", error);
      return defaultCoverResponse();
    }
  }

  try {
    const buffer = await readCachedArtwork(id);
    if (buffer) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    after(() => {
      void extractAndCacheArtwork(found.mix).catch((error) => {
        console.error("Background artwork error:", error);
      });
    });

    return defaultCoverResponse();
  } catch (error) {
    console.error("Artwork error:", error);
    try {
      return await defaultCoverResponse();
    } catch {
      return new Response(
        error instanceof Error ? error.message : "Artwork unavailable",
        { status: 502 },
      );
    }
  }
}
