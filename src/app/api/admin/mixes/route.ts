import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readMixesStore, writeMixesStore } from "@/lib/mixes";
import { normalizeCoverUrl, type MixRecord } from "@/lib/mix-types";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const store = await readMixesStore();
  return NextResponse.json(store);
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json()) as {
    mixes?: MixRecord[];
    folderUrl?: string;
  };

  if (!Array.isArray(body.mixes)) {
    return NextResponse.json({ error: "mixes array is required" }, { status: 400 });
  }

  const current = await readMixesStore();
  const store = {
    folderUrl: body.folderUrl || current.folderUrl,
    updatedAt: new Date().toISOString(),
    mixes: body.mixes.map((mix, index) => ({
      ...mix,
      order: typeof mix.order === "number" ? mix.order : index,
      visible: Boolean(mix.visible),
      title: mix.title?.trim() || mix.filename,
      coverUrl: normalizeCoverUrl(mix.coverUrl),
    })),
  };

  await writeMixesStore(store);
  return NextResponse.json(await readMixesStore());
}
