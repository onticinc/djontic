import Image from "next/image";
import Link from "next/link";
import { PhotographerCredit } from "@/components/PhotographerCredit";
import type { PublicWeddingPost } from "@/lib/wedding-types";

function previewUrls(post: PublicWeddingPost, limit = 4): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: string | null | undefined) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };
  add(post.coverUrl);
  for (const photo of post.photos) add(photo.url);
  return urls.slice(0, limit);
}

function youtubeThumb(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function primaryMediaUrl(post: PublicWeddingPost): string | null {
  if (post.coverUrl) return post.coverUrl;
  for (const video of post.videos) {
    const thumb = youtubeThumb(video.url);
    if (thumb) return thumb;
  }
  return post.photos[0]?.url ?? null;
}

function RecapMeta({ post }: { post: PublicWeddingPost }) {
  const place = [post.city, post.state].filter(Boolean).join(", ");
  const meta = [post.location, place].filter(Boolean).join(" · ");
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-steel">
        {post.dateLabel}
      </p>
      <h3 className="mt-1 font-display text-lg tracking-[0.04em] text-foreground transition group-hover:text-steel sm:text-xl">
        {post.title}
      </h3>
      {meta ? <p className="mt-1 text-sm text-muted">{meta}</p> : null}
      <PhotographerCredit post={post} className="mt-1.5" />
    </div>
  );
}

function PhotoCollage({
  post,
  className,
}: {
  post: PublicWeddingPost;
  className?: string;
}) {
  const previews = previewUrls(post, 4);
  const extraCount = Math.max(
    0,
    post.photos.length + (post.coverUrl ? 1 : 0) - previews.length,
  );

  return (
    <div
      className={`grid grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden bg-surface ${className ?? "aspect-[4/3]"}`}
    >
      {Array.from({ length: 4 }).map((_, tileIndex) => {
        const url = previews[tileIndex];
        return (
          <div key={`${post.id}-${tileIndex}`} className="relative bg-surface-2">
            {url ? (
              <>
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {tileIndex === 3 && extraCount > 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium uppercase tracking-[0.16em] text-white">
                    +{extraCount}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function VideoBanner({ post }: { post: PublicWeddingPost }) {
  const cover = primaryMediaUrl(post);
  return (
    <div className="relative aspect-video overflow-hidden bg-surface">
      {cover ? (
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 1152px) 100vw, 1152px"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-2" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-white">
          <svg
            viewBox="0 0 24 24"
            className="ml-0.5 h-6 w-6 fill-current"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </div>
  );
}

function WidePhotoBanner({ post }: { post: PublicWeddingPost }) {
  const cover = primaryMediaUrl(post);
  const previews = previewUrls(post, 3);

  if (previews.length >= 3) {
    return (
      <div className="grid aspect-[21/9] grid-cols-4 gap-1.5 overflow-hidden bg-surface max-sm:aspect-[4/3] max-sm:grid-cols-2 max-sm:grid-rows-2">
        {previews.map((url, index) => (
          <div
            key={`${post.id}-wide-${index}`}
            className={`relative bg-surface-2 ${
              index === 0 ? "col-span-2 max-sm:col-span-1 max-sm:row-span-2" : ""
            }`}
          >
            <Image
              src={url}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes={
                index === 0
                  ? "(max-width: 640px) 50vw, 50vw"
                  : "(max-width: 640px) 50vw, 25vw"
              }
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative aspect-[21/9] overflow-hidden bg-surface max-sm:aspect-[4/3]">
      {cover ? (
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 1152px) 100vw, 1152px"
        />
      ) : (
        <div className="absolute inset-0 bg-surface-2" />
      )}
    </div>
  );
}

type LayoutMode = "default" | "showcase";

export function WeddingRecapList({
  posts,
  layout = "default",
}: {
  posts: PublicWeddingPost[];
  layout?: LayoutMode;
}) {
  if (posts.length === 0) {
    return (
      <p className="border-t border-border py-10 text-muted">
        Wedding photos will appear here soon.
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {posts.map((post, index) => {
        const isShowcase = layout === "showcase";
        const isHero = isShowcase && index === 0;
        const isVideoRow = isShowcase && index === 1;
        const fullWidth = isHero || isVideoRow;

        return (
          <li
            key={post.id}
            className={fullWidth ? "sm:col-span-2" : undefined}
          >
            <Link href={`/weddings/${post.slug}`} className="group block">
              {isHero ? (
                <WidePhotoBanner post={post} />
              ) : isVideoRow || (!isShowcase && post.videos.length > 0 && index === 0) ? (
                <VideoBanner post={post} />
              ) : (
                <PhotoCollage post={post} />
              )}
              <RecapMeta post={post} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
