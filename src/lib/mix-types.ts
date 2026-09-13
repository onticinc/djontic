export type MixRecord = {
  id: string;
  filename: string;
  title: string;
  driveId: string | null;
  path: string;
  visible: boolean;
  order: number;
  /** Optional external cover image URL (https…). */
  coverUrl: string | null;
};

export type MixesStore = {
  folderUrl: string;
  updatedAt: string;
  mixes: MixRecord[];
};

export type Mix = {
  id: string;
  title: string;
  description?: string;
  filename: string;
  streamUrl: string;
  downloadUrl: string;
  shareUrl: string;
  pageUrl: string;
  artworkUrl: string;
  peaksUrl: string;
  playCount: number;
};

export function filenameToTitle(filename: string): string {
  const base = filename.replace(/\.mp3$/i, "");
  return base
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bdj\s*ontic\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function filenameToId(filename: string): string {
  return filename
    .replace(/\.mp3$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function sortMixes(mixes: MixRecord[]): MixRecord[] {
  return [...mixes].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function normalizeCoverUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Normalize older Dropbox-shaped records into Drive records. */
export function normalizeMixRecord(raw: Record<string, unknown>): MixRecord {
  const filename = String(raw.filename ?? "");
  return {
    id: String(raw.id ?? filenameToId(filename)),
    filename,
    title: String(raw.title ?? filenameToTitle(filename)),
    driveId:
      (typeof raw.driveId === "string" && raw.driveId) ||
      (typeof raw.dropboxId === "string" && raw.dropboxId) ||
      null,
    path: String(raw.path ?? `/${filename}`),
    visible: Boolean(raw.visible),
    order: typeof raw.order === "number" ? raw.order : 0,
    coverUrl: normalizeCoverUrl(raw.coverUrl),
  };
}
