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
const PEAK_COUNT = 80;
const PEAK_CHUNK = 12288;
/** Bump to invalidate flat historical peak caches. */
const PEAKS_VERSION = 3;

async function readRange(mix: MixRecord, start: number, end: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await openMixContent(mix, `bytes=${start}-${end}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Range read failed");
}

function peaksLookValid(peaks: number[]): boolean {
  if (peaks.length < 8) return false;
  let trailing = 0;
  for (let i = peaks.length - 1; i >= 0; i--) {
    if (peaks[i] >= 0.05) break;
    trailing += 1;
  }
  if (trailing / peaks.length >= 0.2) return false;

  // Reject near-flat waveforms (old MP3 byte averages).
  const min = Math.min(...peaks);
  const max = Math.max(...peaks);
  return max - min >= 0.18;
}

/** Score a compressed MP3 slice — variance + local peaks beat raw averages. */
function energyOf(buffer: Buffer) {
  const step = 2;
  let sum = 0;
  let sumSq = 0;
  let peak = 0;
  let delta = 0;
  let count = 0;
  let prev = buffer[0] ?? 128;

  for (let j = 0; j < buffer.length; j += step) {
    const v = buffer[j];
    sum += v;
    sumSq += v * v;
    const centered = Math.abs(v - 128);
    if (centered > peak) peak = centered;
    delta += Math.abs(v - prev);
    prev = v;
    count += 1;
  }

  if (!count) return 0;
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return Math.sqrt(variance) * 0.55 + peak * 0.25 + (delta / count) * 0.2;
}

/** Percentile stretch so quiet and loud sections actually contrast. */
function expandDynamicRange(peaks: number[]): number[] {
  const sorted = [...peaks].sort((a, b) => a - b);
  const lo = sorted[Math.floor((sorted.length - 1) * 0.1)] ?? 0;
  const hi = sorted[Math.floor((sorted.length - 1) * 0.9)] ?? 1;
  const span = Math.max(hi - lo, 1e-6);

  return peaks.map((value) => {
    const t = Math.min(1, Math.max(0, (value - lo) / span));
    // Mild lift so bars don't collapse to hairlines, without flattening.
    return Number((0.06 + Math.pow(t, 0.85) * 0.94).toFixed(4));
  });
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

export async function extractAndCachePeaks(
  mix: MixRecord,
  options?: { force?: boolean },
): Promise<number[]> {
  const dest = peaksPath(mix.id);
  if (!options?.force) {
    try {
      const cached = JSON.parse(await fs.readFile(dest, "utf8")) as {
        peaks: number[];
        version?: number;
      };
      if (
        cached.version === PEAKS_VERSION &&
        cached.peaks?.length &&
        peaksLookValid(cached.peaks)
      ) {
        return cached.peaks;
      }
    } catch {
      // continue
    }
  }

  const probe = await openMixContent(mix, "bytes=0-0");
  const contentRange = probe.headers.get("content-range");
  const lengthHeader = probe.headers.get("content-length");
  void probe.body?.cancel();
  let fileSize = Number(lengthHeader || 0);
  if (contentRange?.includes("/")) {
    fileSize = Number(contentRange.split("/")[1]) || fileSize;
  }
  if (!fileSize || !Number.isFinite(fileSize)) {
    fileSize = ARTWORK_BYTES;
  }

  const peaks: number[] = [];
  let previous = 0.35;

  for (let i = 0; i < PEAK_COUNT; i++) {
    const center = Math.floor(
      (i / Math.max(PEAK_COUNT - 1, 1)) * Math.max(fileSize - PEAK_CHUNK, 0),
    );
    const start = Math.max(0, center);
    const end = Math.min(fileSize - 1, start + PEAK_CHUNK - 1);
    try {
      const buffer = await readRange(mix, start, end);
      previous = energyOf(buffer);
      peaks.push(previous);
    } catch {
      // Keep continuity instead of flatlining the rest of the waveform.
      peaks.push(previous);
    }
  }

  const normalized = expandDynamicRange(peaks);

  if (!peaksLookValid(normalized)) {
    throw new Error(`Peak sampling failed for ${mix.id}`);
  }

  await ensureDir(path.dirname(dest));
  await fs.writeFile(
    dest,
    JSON.stringify({
      peaks: normalized,
      version: PEAKS_VERSION,
      updatedAt: new Date().toISOString(),
    }),
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
    const dest = peaksPath(mixId);
    const raw = JSON.parse(await fs.readFile(dest, "utf8")) as {
      peaks: number[];
      version?: number;
    };
    if (!raw.peaks?.length) return null;

    // Trailing zeros = broken Drive sample run.
    let trailing = 0;
    for (let i = raw.peaks.length - 1; i >= 0; i--) {
      if (raw.peaks[i] >= 0.05) break;
      trailing += 1;
    }
    if (trailing / raw.peaks.length >= 0.2) return null;

    if (raw.version === PEAKS_VERSION && peaksLookValid(raw.peaks)) {
      return raw.peaks;
    }

    // Upgrade flat legacy caches without re-hitting Drive.
    const expanded = expandDynamicRange(raw.peaks);
    if (!peaksLookValid(expanded)) return null;

    await fs.writeFile(
      dest,
      JSON.stringify({
        peaks: expanded,
        version: PEAKS_VERSION,
        updatedAt: new Date().toISOString(),
      }),
    );
    return expanded;
  } catch {
    return null;
  }
}
