import { promises as fs } from "fs";
import path from "path";
import type { MixRecord } from "./mix-types";

const DEFAULT_FOLDER_ID = "1UzGeGSL1lNlXrq0sNGCmPzUHz_GgoH1S";
const DEFAULT_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_FOLDER_ID}?usp=drive_link`;

export function getGoogleDriveApiKey() {
  return process.env.GOOGLE_DRIVE_API_KEY?.trim() || "";
}

export function getDriveFolderId() {
  const fromEnv = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (fromEnv) return fromEnv;

  const url =
    process.env.GOOGLE_DRIVE_FOLDER_URL?.trim() ||
    DEFAULT_FOLDER_URL;
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || DEFAULT_FOLDER_ID;
}

export function getDriveFolderUrl() {
  return (
    process.env.GOOGLE_DRIVE_FOLDER_URL?.trim() ||
    `https://drive.google.com/drive/folders/${getDriveFolderId()}?usp=drive_link`
  );
}

export function isDriveConfigured() {
  return Boolean(getGoogleDriveApiKey() && getDriveFolderId());
}

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
};

const SHARE_HINT =
  'Open the mixes folder in Google Drive → Share → General access → “Anyone with the link” → Viewer. API keys can only read publicly shared folders.';

async function assertFolderAccessible(folderId: string, key: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true&key=${encodeURIComponent(key)}`,
  );
  const payload = (await response.json()) as {
    error?: { message?: string };
    id?: string;
    name?: string;
  };

  if (response.status === 404 || payload.error?.message?.includes("not found")) {
    throw new Error(
      `Google Drive folder is not publicly readable (File not found). ${SHARE_HINT}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      payload.error?.message ||
        `Google Drive folder lookup failed (${response.status})`,
    );
  }

  return payload;
}

export async function listMixFilesFromDrive(folderId = getDriveFolderId()) {
  const key = getGoogleDriveApiKey();
  if (!key) {
    throw new Error(
      "GOOGLE_DRIVE_API_KEY is missing. Add a Drive-enabled Google API key to .env.",
    );
  }

  await assertFolderAccessible(folderId, key);

  const files: Array<{ id: string; name: string; pathDisplay: string }> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,size)",
      pageSize: "100",
      key,
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      orderBy: "name",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    );
    const payload = (await response.json()) as {
      error?: { message?: string };
      files?: DriveFile[];
      nextPageToken?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.error?.message ||
          `Google Drive list failed (${response.status})`,
      );
    }

    for (const file of payload.files ?? []) {
      if (!file.name?.toLowerCase().endsWith(".mp3")) continue;
      files.push({
        id: file.id,
        name: file.name,
        pathDisplay: `/${file.name}`,
      });
    }

    pageToken = payload.nextPageToken;
  } while (pageToken);

  if (files.length === 0) {
    throw new Error(
      `No MP3 files found in the Drive folder. Confirm files are inside the folder (not only shortcuts), and that the folder is shared as “Anyone with the link”.`,
    );
  }

  return files;
}

export function getPublicDownloadUrl(fileId: string) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

export async function openMixContent(mix: MixRecord, range?: string) {
  const fileId = mix.driveId;
  if (!fileId) {
    throw new Error(
      `Mix "${mix.title}" has no Google Drive file id. Sync from Drive in /admin/mixes.`,
    );
  }

  // Public download endpoint (API keys cannot use alt=media).
  // Use a browser UA — Drive returns a sign-in HTML page for custom agents.
  const response = await fetch(getPublicDownloadUrl(fileId), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      ...(range ? { Range: range } : {}),
    },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type") || "";
  if (
    (!response.ok && response.status !== 206) ||
    contentType.includes("text/html")
  ) {
    const text = await response.text();
    throw new Error(
      `Google Drive media fetch failed (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  return response;
}

export async function diagnoseDrive() {
  if (!getGoogleDriveApiKey()) {
    return {
      ok: false,
      error: "GOOGLE_DRIVE_API_KEY is missing.",
      hint: "Add GOOGLE_DRIVE_API_KEY to .env and enable Google Drive API on that key’s project.",
    };
  }

  try {
    const key = getGoogleDriveApiKey();
    const folderId = getDriveFolderId();
    await assertFolderAccessible(folderId, key);
    const files = await listMixFilesFromDrive(folderId);
    return {
      ok: true,
      error: null,
      hint: null,
      fileCount: files.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let hint = SHARE_HINT;
    if (message.includes("has not been used") || message.includes("disabled")) {
      hint =
        "Enable Google Drive API on the project that owns GOOGLE_DRIVE_API_KEY, then retry.";
    }
    return { ok: false, error: message, hint, fileCount: 0 };
  }
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function artworkPath(mixId: string) {
  return path.join(process.cwd(), "data", "artwork", `${mixId}.jpg`);
}

export function peaksPath(mixId: string) {
  return path.join(process.cwd(), "data", "peaks", `${mixId}.json`);
}
