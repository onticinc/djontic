import { promises as fs } from "fs";
import path from "path";
import { parseBuffer } from "music-metadata";
import {
  artworkPath,
  ensureDir,
  openMixContent,
  peaksPath,
} from "./gdrive";
import type { MixRecord } from "./mix-types";

const ARTWORK_BYTES = 1024 * 1024;
const PEAK_COUNT = 64;

async function readRange(mix: MixRecord, start: number, end: number) {
  const response = await openMixContent(mix, `bytes=${start}-${end}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function extractAndCacheArtwork(
  mix: MixRecord,
): Promise<string | null> {
  const dest = artworkPath(mix.id);
  try {
    await fs.access(dest);
    return `/api/mixes/${encodeURIComponent(mix.id)}/artwork`;
  } catch {
    // continue
  }

  const buffer = await readRange(mix, 0, ARTWORK_BYTES - 1);
  const metadata = await parseBuffer(buffer, { mimeType: "audio/mpeg" });
  const picture = metadata.common.picture?.[0];
  if (!picture?.data?.length) return null;

  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, picture.data);
  return `/api/mixes/${encodeURIComponent(mix.id)}/artwork`;
}

export async function extractAndCachePeaks(mix: MixRecord): Promise<number[]> {
  const dest = peaksPath(mix.id);
  try {
    const cached = JSON.parse(await fs.readFile(dest, "utf8")) as {
      peaks: number[];
    };
    if (cached.peaks?.length) return cached.peaks;
  } catch {
    // continue
  }

  const probe = await openMixContent(mix, "bytes=0-0");
  const contentRange = probe.headers.get("content-range");
  const lengthHeader = probe.headers.get("content-length");
  // Don't keep the probe body around.
  void probe.body?.cancel();
  let fileSize = Number(lengthHeader || 0);
  if (contentRange?.includes("/")) {
    fileSize = Number(contentRange.split("/")[1]) || fileSize;
  }
  if (!fileSize || !Number.isFinite(fileSize)) {
    fileSize = ARTWORK_BYTES;
  }

  const peaks: number[] = [];
  const chunkSize = 4096;

  for (let i = 0; i < PEAK_COUNT; i++) {
    const center = Math.floor(
      (i / PEAK_COUNT) * Math.max(fileSize - chunkSize, 0),
    );
    const start = Math.max(0, center);
    const end = Math.min(fileSize - 1, start + chunkSize - 1);
    try {
      const buffer = await readRange(mix, start, end);
      let energy = 0;
      for (let j = 0; j < buffer.length; j += 8) {
        energy += Math.abs(buffer[j] - 128);
      }
      peaks.push(energy / Math.max(1, Math.floor(buffer.length / 8)));
    } catch {
      peaks.push(0);
    }
  }

  const max = Math.max(...peaks, 1);
  const normalized = peaks.map((value) => Number((value / max).toFixed(4)));

  await ensureDir(path.dirname(dest));
  await fs.writeFile(
    dest,
    JSON.stringify({ peaks: normalized, updatedAt: new Date().toISOString() }),
  );

  return normalized;
}

export async function readCachedArtwork(mixId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(artworkPath(mixId));
  } catch {
    return null;
  }
}

export async function readCachedPeaks(mixId: string): Promise<number[] | null> {
  try {
    const raw = JSON.parse(await fs.readFile(peaksPath(mixId), "utf8")) as {
      peaks: number[];
    };
    return raw.peaks ?? null;
  } catch {
    return null;
  }
}
