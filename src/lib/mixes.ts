import { promises as fs } from "fs";
import path from "path";
import { getPlayCounts } from "./play-counts";
import { getDriveFolderUrl } from "./gdrive";
import {
  filenameToId,
  filenameToTitle,
  normalizeMixRecord,
  sortMixes,
  syncCategoryOrder,
  type Mix,
  type MixRecord,
  type MixesStore,
} from "./mix-types";

export type { Mix, MixRecord, MixesStore };

const DATA_PATH = path.join(process.cwd(), "data", "mixes.json");

function artworkUrlFor(mix: MixRecord) {
  const base = `/api/mixes/${encodeURIComponent(mix.id)}/artwork`;
  if (!mix.coverUrl) return base;
  // Bust browser cache when the cover link changes.
  const token = Buffer.from(mix.coverUrl).toString("base64url").slice(0, 12);
  return `${base}?c=${token}`;
}

export async function readMixesStore(): Promise<MixesStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      folderUrl?: string;
      updatedAt?: string;
      mixes?: Array<Record<string, unknown>>;
      categoryOrder?: unknown;
    };
    const mixes = sortMixes((parsed.mixes ?? []).map(normalizeMixRecord));
    const categoryOrder = Array.isArray(parsed.categoryOrder)
      ? syncCategoryOrder(
          mixes,
          parsed.categoryOrder.filter(
            (item): item is string => typeof item === "string",
          ),
        )
      : syncCategoryOrder(mixes);
    return {
      folderUrl: parsed.folderUrl || getDriveFolderUrl(),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      mixes,
      categoryOrder,
    };
  } catch {
    return {
      folderUrl: getDriveFolderUrl(),
      updatedAt: new Date().toISOString(),
      mixes: [],
      categoryOrder: [],
    };
  }
}

export async function writeMixesStore(store: MixesStore): Promise<void> {
  const mixes = sortMixes(store.mixes).map((mix, index) => ({
    ...normalizeMixRecord(mix as unknown as Record<string, unknown>),
    order: index,
  }));
  const next: MixesStore = {
    folderUrl: store.folderUrl || getDriveFolderUrl(),
    updatedAt: new Date().toISOString(),
    mixes,
    categoryOrder: syncCategoryOrder(mixes, store.categoryOrder ?? []),
  };

  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export async function getFeaturedMixes(): Promise<{
  mixes: Mix[];
  categoryOrder: string[];
}> {
  const store = await readMixesStore();
  const playCounts = await getPlayCounts();

  return {
    categoryOrder: store.categoryOrder,
    mixes: store.mixes
      .filter((mix) => mix.visible)
      .map((mix) => ({
        id: mix.id,
        title: mix.title,
        filename: mix.filename,
        shareUrl: store.folderUrl,
        pageUrl: `/mix/${encodeURIComponent(mix.id)}`,
        // ?v=2 busts browsers that cached the earlier 302→Drive redirect.
        streamUrl: `/api/mixes/${encodeURIComponent(mix.id)}/stream?v=2`,
        downloadUrl: `/api/mixes/${encodeURIComponent(mix.id)}/download`,
        artworkUrl: artworkUrlFor(mix),
        peaksUrl: `/api/mixes/${encodeURIComponent(mix.id)}/peaks?v=3`,
        playCount: playCounts[mix.id] ?? 0,
        category: mix.category,
      })),
  };
}

export async function getMixById(id: string): Promise<{
  mix: MixRecord;
  folderUrl: string;
} | null> {
  const store = await readMixesStore();
  const mix = store.mixes.find((item) => item.id === id);
  if (!mix) return null;
  return { mix, folderUrl: store.folderUrl };
}

export function mergeSyncedFiles(
  existing: MixRecord[],
  files: Array<{ id: string; name: string; pathDisplay: string }>,
): MixRecord[] {
  const byFilename = new Map(existing.map((mix) => [mix.filename, mix]));
  const next: MixRecord[] = [];

  for (const file of files) {
    const current = byFilename.get(file.name);
    if (current) {
      next.push({
        ...current,
        driveId: file.id,
        path: file.pathDisplay,
        filename: file.name,
      });
      byFilename.delete(file.name);
    } else {
      next.push({
        id: filenameToId(file.name),
        filename: file.name,
        title: filenameToTitle(file.name),
        driveId: file.id,
        path: file.pathDisplay,
        visible: false,
        order: existing.length + next.length,
        coverUrl: null,
        category: null,
      });
    }
  }

  for (const leftover of byFilename.values()) {
    next.push({ ...leftover, visible: false });
  }

  return sortMixes(next).map((mix, index) => ({ ...mix, order: index }));
}
