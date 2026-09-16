import { promises as fs } from "fs";
import path from "path";
import { getPlayCounts } from "./play-counts";
import { getDriveFolderUrl } from "./gdrive";
import {
  filenameToTitle,
  normalizeMixRecord,
  sortMixes,
  syncCategoryOrder,
  allocateMixId,
  ensureUniqueMixIds,
  uniqueStrings,
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
      ignoredDriveIds?: unknown;
      ignoredFilenames?: unknown;
    };
    const mixes = ensureUniqueMixIds(
      sortMixes((parsed.mixes ?? []).map(normalizeMixRecord)),
    );
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
      ignoredDriveIds: uniqueStrings(parsed.ignoredDriveIds),
      ignoredFilenames: uniqueStrings(parsed.ignoredFilenames),
    };
  } catch {
    return {
      folderUrl: getDriveFolderUrl(),
      updatedAt: new Date().toISOString(),
      mixes: [],
      categoryOrder: [],
      ignoredDriveIds: [],
      ignoredFilenames: [],
    };
  }
}

export async function writeMixesStore(store: MixesStore): Promise<void> {
  const mixes = ensureUniqueMixIds(
    sortMixes(store.mixes).map((mix, index) => ({
      ...normalizeMixRecord(mix as unknown as Record<string, unknown>),
      order: index,
    })),
  ).map((mix, index) => ({ ...mix, order: index }));
  const next: MixesStore = {
    folderUrl: store.folderUrl || getDriveFolderUrl(),
    updatedAt: new Date().toISOString(),
    mixes,
    categoryOrder: syncCategoryOrder(mixes, store.categoryOrder ?? []),
    ignoredDriveIds: uniqueStrings(store.ignoredDriveIds),
    ignoredFilenames: uniqueStrings(store.ignoredFilenames),
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
  ignored: { driveIds?: string[]; filenames?: string[] } = {},
): MixRecord[] {
  const remaining = [...existing];
  const next: MixRecord[] = [];
  const usedIds = new Set<string>();
  const ignoredDriveIds = new Set(uniqueStrings(ignored.driveIds));
  const ignoredFilenames = new Set(uniqueStrings(ignored.filenames));

  function takeMatch(
    predicate: (mix: MixRecord) => boolean,
  ): MixRecord | undefined {
    const index = remaining.findIndex(predicate);
    if (index < 0) return undefined;
    const [mix] = remaining.splice(index, 1);
    return mix;
  }

  for (const file of files) {
    const current =
      takeMatch((mix) => mix.filename === file.name) ??
      takeMatch((mix) => Boolean(mix.driveId) && mix.driveId === file.id);

    if (current) {
      if (current.id) usedIds.add(current.id);
      next.push({
        ...current,
        driveId: file.id,
        path: file.pathDisplay,
        filename: file.name,
      });
      continue;
    }

    if (ignoredDriveIds.has(file.id) || ignoredFilenames.has(file.name)) {
      continue;
    }

    next.push({
      id: allocateMixId(file.name, usedIds),
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

  for (const leftover of remaining) {
    next.push({ ...leftover, visible: false });
  }

  return ensureUniqueMixIds(sortMixes(next)).map((mix, index) => ({
    ...mix,
    order: index,
  }));
}
