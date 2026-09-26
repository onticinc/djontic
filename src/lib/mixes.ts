import { api } from "@convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { getDriveFolderUrl } from "./gdrive";
import { getPlayCounts } from "./play-counts";
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

function artworkUrlFor(mix: MixRecord) {
  const base = `/api/mixes/${encodeURIComponent(mix.id)}/artwork`;
  if (!mix.coverUrl) return base;
  const token = Buffer.from(mix.coverUrl).toString("base64url").slice(0, 12);
  return `${base}?c=${token}`;
}

function docToMixRecord(doc: {
  mixKey: string;
  filename: string;
  title: string;
  driveId: string | null;
  path: string;
  visible: boolean;
  order: number;
  coverUrl: string | null;
  category: string | null;
}): MixRecord {
  return {
    id: doc.mixKey,
    filename: doc.filename,
    title: doc.title,
    driveId: doc.driveId,
    path: doc.path,
    visible: doc.visible,
    order: doc.order,
    coverUrl: doc.coverUrl,
    category: doc.category,
  };
}

export async function readMixesStore(): Promise<MixesStore> {
  const [mixes, settings] = await Promise.all([
    fetchQuery(api.mixes.listAll, {}),
    fetchQuery(api.mixes.getSettings, {}),
  ]);
  const records = ensureUniqueMixIds(sortMixes(mixes.map(docToMixRecord)));
  return {
    folderUrl: settings.folderUrl || getDriveFolderUrl(),
    updatedAt: settings.updatedAt || new Date().toISOString(),
    mixes: records,
    categoryOrder: syncCategoryOrder(records, settings.categoryOrder ?? []),
    ignoredDriveIds: uniqueStrings(settings.ignoredDriveIds),
    ignoredFilenames: uniqueStrings(settings.ignoredFilenames),
  };
}

export async function writeMixesStore(
  store: MixesStore,
  token?: string,
): Promise<void> {
  const mixes = ensureUniqueMixIds(
    sortMixes(store.mixes).map((mix, index) => ({
      ...normalizeMixRecord(mix as unknown as Record<string, unknown>),
      order: index,
    })),
  ).map((mix, index) => ({ ...mix, order: index }));
  const categoryOrder = syncCategoryOrder(mixes, store.categoryOrder ?? []);
  const ignoredDriveIds = uniqueStrings(store.ignoredDriveIds);
  const ignoredFilenames = uniqueStrings(store.ignoredFilenames);

  await fetchMutation(
    api.mixes.replaceAll,
    {
      mixes: mixes.map((mix) => ({
        mixKey: mix.id,
        filename: mix.filename,
        title: mix.title,
        driveId: mix.driveId,
        path: mix.path,
        visible: mix.visible,
        order: mix.order,
        coverUrl: mix.coverUrl,
        category: mix.category,
      })),
      folderUrl: store.folderUrl || getDriveFolderUrl(),
      categoryOrder,
      ignoredDriveIds,
      ignoredFilenames,
    },
    token ? { token } : undefined,
  );
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
  const [doc, settings] = await Promise.all([
    fetchQuery(api.mixes.getByKey, { mixKey: id }),
    fetchQuery(api.mixes.getSettings, {}),
  ]);
  if (!doc) return null;
  return {
    mix: docToMixRecord(doc),
    folderUrl: settings.folderUrl || getDriveFolderUrl(),
  };
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
