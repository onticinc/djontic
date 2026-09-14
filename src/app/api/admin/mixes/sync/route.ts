import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getDriveFolderUrl,
  isDriveConfigured,
  listMixFilesFromDrive,
} from "@/lib/gdrive";
import { mergeSyncedFiles, readMixesStore, writeMixesStore } from "@/lib/mixes";

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!isDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google Drive is not configured. Set GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_ID, then enable Drive API on that key’s project.",
      },
      { status: 503 },
    );
  }

  try {
    const current = await readMixesStore();
    const folderUrl = getDriveFolderUrl();
    const files = await listMixFilesFromDrive();
    const mixes = mergeSyncedFiles(current.mixes, files);

    await writeMixesStore({
      folderUrl,
      updatedAt: new Date().toISOString(),
      mixes,
      categoryOrder: current.categoryOrder,
    });

    return NextResponse.json({
      ok: true,
      imported: files.length,
      store: await readMixesStore(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google Drive sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
