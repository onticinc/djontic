import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import { requireConvexAdmin } from "@/lib/convex-admin";
import {
  getDriveFolderUrl,
  isDriveConfigured,
  listMixFilesFromDrive,
} from "@/lib/gdrive";
import { mergeSyncedFiles, readMixesStore, writeMixesStore } from "@/lib/mixes";

export async function POST() {
  const unauthorized = await requireConvexAdmin();
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
    const token = await convexAuthNextjsToken();
    const current = await readMixesStore();
    const folderUrl = getDriveFolderUrl();
    const files = await listMixFilesFromDrive();
    const mixes = mergeSyncedFiles(current.mixes, files, {
      driveIds: current.ignoredDriveIds,
      filenames: current.ignoredFilenames,
    });

    await writeMixesStore(
      {
        folderUrl,
        updatedAt: new Date().toISOString(),
        mixes,
        categoryOrder: current.categoryOrder,
        ignoredDriveIds: current.ignoredDriveIds,
        ignoredFilenames: current.ignoredFilenames,
      },
      token,
    );

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
