import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readMixesStore, writeMixesStore } from "@/lib/mixes";
import { getPlayCounts } from "@/lib/play-counts";
import {
  normalizeCategory,
  normalizeCoverUrl,
  syncCategoryOrder,
  uniqueStrings,
  type MixRecord,
} from "@/lib/mix-types";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const store = await readMixesStore();
  const playCounts = await getPlayCounts();
  return NextResponse.json({ ...store, playCounts });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    mixes?: MixRecord[];
    folderUrl?: string;
    categoryOrder?: string[];
    ignoredDriveIds?: unknown;
    ignoredFilenames?: unknown;
  };

  if (!Array.isArray(body.mixes)) {
    return NextResponse.json({ error: "mixes array is required" }, { status: 400 });
  }

  const current = await readMixesStore();
  const mixes = body.mixes.map((mix, index) => ({
    ...mix,
    order: typeof mix.order === "number" ? mix.order : index,
    visible: Boolean(mix.visible),
    title: mix.title?.trim() || mix.filename,
    coverUrl: normalizeCoverUrl(mix.coverUrl),
    category: normalizeCategory(mix.category),
  }));

  const store = {
    folderUrl: body.folderUrl || current.folderUrl,
    updatedAt: new Date().toISOString(),
    mixes,
    categoryOrder: syncCategoryOrder(
      mixes,
      Array.isArray(body.categoryOrder)
        ? body.categoryOrder
        : current.categoryOrder,
    ),
    ignoredDriveIds: Array.isArray(body.ignoredDriveIds)
      ? uniqueStrings(body.ignoredDriveIds)
      : current.ignoredDriveIds,
    ignoredFilenames: Array.isArray(body.ignoredFilenames)
      ? uniqueStrings(body.ignoredFilenames)
      : current.ignoredFilenames,
  };

  await writeMixesStore(store);
  const playCounts = await getPlayCounts();
  return NextResponse.json({ ...(await readMixesStore()), playCounts });
}
