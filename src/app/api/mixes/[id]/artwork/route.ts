import { promises as fs } from "fs";
import path from "path";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { getMixById } from "@/lib/mixes";
import {
  extractAndCacheArtwork,
  readCachedArtwork,
} from "@/lib/mix-media";

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

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const found = await getMixById(id);
  if (!found || !found.mix.visible) {
    return new Response("Not found", { status: 404 });
  }

  // Manual cover link from admin takes priority over ID3 / default.
  if (found.mix.coverUrl) {
    return NextResponse.redirect(found.mix.coverUrl, 302);
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
