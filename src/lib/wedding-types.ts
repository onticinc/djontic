export type WeddingPhoto = {
  id: string;
  url: string;
  alt: string;
};

export type WeddingVideo = {
  id: string;
  url: string;
  provider: "youtube" | "vimeo" | "other";
};

export type WeddingPost = {
  id: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  city: string;
  state: string;
  excerpt: string;
  bodyHtml: string;
  coverUrl: string | null;
  photos: WeddingPhoto[];
  videos: WeddingVideo[];
  published: boolean;
  updatedAt: string;
};

export type WeddingsStore = {
  updatedAt: string;
  posts: WeddingPost[];
};

export type PublicWeddingPost = {
  id: string;
  slug: string;
  title: string;
  date: string;
  dateLabel: string;
  location: string;
  city: string;
  state: string;
  excerpt: string;
  bodyHtml: string;
  coverUrl: string | null;
  photos: WeddingPhoto[];
  videos: WeddingVideo[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

export function formatWeddingDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Boise",
  }).format(date);
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function allocateSlug(base: string, used: Set<string>): string {
  const cleaned = slugifyTitle(base) || "wedding";
  let slug = cleaned;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${cleaned}-${suffix}`;
    suffix += 1;
  }
  used.add(slug);
  return slug;
}

export function detectVideoProvider(
  url: string,
): WeddingVideo["provider"] {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      return "youtube";
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      return "vimeo";
    }
  } catch {
    return "other";
  }
  return "other";
}

export function normalizeVideoUrl(value: unknown): string | null {
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

export function normalizeCoverUrl(value: unknown): string | null {
  return normalizeVideoUrl(value);
}

export function sortWeddingPosts(posts: WeddingPost[]): WeddingPost[] {
  return [...posts].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.title.localeCompare(b.title) ||
      a.slug.localeCompare(b.slug),
  );
}

export function normalizePhoto(
  raw: Record<string, unknown>,
): WeddingPhoto | null {
  const url = normalizeCoverUrl(raw.url);
  if (!url) return null;
  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : crypto.randomUUID(),
    url,
    alt: typeof raw.alt === "string" ? raw.alt.trim() : "",
  };
}

export function normalizeVideo(
  raw: Record<string, unknown>,
): WeddingVideo | null {
  const url = normalizeVideoUrl(raw.url);
  if (!url) return null;
  const provider =
    raw.provider === "youtube" ||
    raw.provider === "vimeo" ||
    raw.provider === "other"
      ? raw.provider
      : detectVideoProvider(url);
  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : crypto.randomUUID(),
    url,
    provider,
  };
}

export function normalizeWeddingPost(
  raw: Record<string, unknown>,
): WeddingPost | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  if (!title || !isIsoDate(date)) return null;

  const slugRaw = typeof raw.slug === "string" ? raw.slug.trim() : "";
  const slug = slugifyTitle(slugRaw || title) || "wedding";

  const photos = Array.isArray(raw.photos)
    ? raw.photos
        .filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object"),
        )
        .map(normalizePhoto)
        .filter((item): item is WeddingPhoto => item !== null)
    : [];

  const videos = Array.isArray(raw.videos)
    ? raw.videos
        .filter((item): item is Record<string, unknown> =>
          Boolean(item && typeof item === "object"),
        )
        .map(normalizeVideo)
        .filter((item): item is WeddingVideo => item !== null)
    : [];

  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : crypto.randomUUID(),
    slug,
    title,
    date,
    location: typeof raw.location === "string" ? raw.location.trim() : "",
    city: typeof raw.city === "string" ? raw.city.trim() : "",
    state: typeof raw.state === "string" ? raw.state.trim() : "",
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt.trim() : "",
    bodyHtml: typeof raw.bodyHtml === "string" ? raw.bodyHtml : "",
    coverUrl: normalizeCoverUrl(raw.coverUrl),
    photos,
    videos,
    published: Boolean(raw.published),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

export function ensureUniqueSlugs(posts: WeddingPost[]): WeddingPost[] {
  const used = new Set<string>();
  return posts.map((post) => {
    if (post.slug && !used.has(post.slug)) {
      used.add(post.slug);
      return post;
    }
    return { ...post, slug: allocateSlug(post.slug || post.title, used) };
  });
}

/** Build an embeddable URL for YouTube / Vimeo when possible. */
export function videoEmbedUrl(video: WeddingVideo): string | null {
  try {
    const url = new URL(video.url);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const shorts = url.pathname.match(/\/shorts\/([^/]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`;
      const embed = url.pathname.match(/\/embed\/([^/]+)/);
      if (embed?.[1]) return `https://www.youtube.com/embed/${embed[1]}`;
    }

    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}
