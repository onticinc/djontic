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
  /** Optional grouping label shown on the mixes page. */
  category: string | null;
};

export type MixesStore = {
  folderUrl: string;
  updatedAt: string;
  mixes: MixRecord[];
  /** Display order for named categories on the mixes page. */
  categoryOrder: string[];
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
  category: string | null;
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

export function normalizeCategory(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Keep saved order, drop unused names, append newly seen categories. */
export function syncCategoryOrder(
  mixes: MixRecord[],
  order: string[] = [],
): string[] {
  const used = new Set<string>();
  for (const mix of mixes) {
    const category = normalizeCategory(mix.category);
    if (category) used.add(category);
  }

  const next: string[] = [];
  const seen = new Set<string>();
  for (const name of order) {
    const category = normalizeCategory(name);
    if (!category || !used.has(category) || seen.has(category)) continue;
    next.push(category);
    seen.add(category);
  }
  for (const category of used) {
    if (seen.has(category)) continue;
    next.push(category);
    seen.add(category);
  }
  return next;
}

/** Turn share/preview links into a URL that actually returns image bytes. */
export function resolveCoverFetchUrl(coverUrl: string): string {
  try {
    const url = new URL(coverUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "dropbox.com" || host === "dl.dropboxusercontent.com") {
      url.hostname = "dl.dropboxusercontent.com";
      url.searchParams.set("dl", "1");
      url.searchParams.delete("st");
      return url.toString();
    }

    // drive.google.com/file/d/ID/view → uc?export=download
    const driveMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (host === "drive.google.com" && driveMatch) {
      return `https://drive.usercontent.google.com/download?id=${driveMatch[1]}&export=view`;
    }

    return url.toString();
  } catch {
    return coverUrl;
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
    category: normalizeCategory(raw.category),
  };
}
