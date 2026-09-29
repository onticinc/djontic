import Image from "next/image";
import { PhotographerCredit } from "@/components/PhotographerCredit";
import type { PublicWeddingPost } from "@/lib/wedding-types";
import { videoEmbedUrl } from "@/lib/wedding-types";
import { sanitizeWeddingHtml } from "@/lib/sanitize-html";

export function WeddingRecapDetail({ post }: { post: PublicWeddingPost }) {
  const place = [post.city, post.state].filter(Boolean).join(", ");
  const body = sanitizeWeddingHtml(post.bodyHtml);
  const meta = [post.location, place].filter(Boolean).join(" · ");

  const gallery = (() => {
    const seen = new Set<string>();
    const items: Array<{ id: string; url: string; alt: string }> = [];
    for (const photo of post.photos) {
      if (seen.has(photo.url)) continue;
      seen.add(photo.url);
      items.push(photo);
    }
    if (post.coverUrl && !seen.has(post.coverUrl) && items.length === 0) {
      items.push({
        id: "cover",
        url: post.coverUrl,
        alt: post.title,
      });
    }
    return items;
  })();

  return (
    <article>
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-steel">
          {post.dateLabel}
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.06em] text-foreground sm:text-4xl">
          {post.title}
        </h1>
        {meta ? <p className="mt-3 text-sm text-muted">{meta}</p> : null}
      </header>

      {post.videos.length > 0 ? (
        <section className="mt-10 space-y-6">
          {post.videos.map((video) => {
            const embed = videoEmbedUrl(video);
            return (
              <div key={video.id}>
                {embed ? (
                  <div className="aspect-video overflow-hidden border border-border bg-surface">
                    <iframe
                      src={embed}
                      title={`${post.title} video`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground underline underline-offset-4"
                  >
                    Watch video
                  </a>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <section className="mt-10">
          <ul
            className={`grid gap-2 sm:gap-3 ${
              gallery.length === 1
                ? "grid-cols-1"
                : gallery.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {gallery.map((photo, index) => {
              const featured = index === 0 && gallery.length >= 3;
              return (
                <li
                  key={photo.id}
                  className={`relative overflow-hidden border border-border bg-surface ${
                    featured
                      ? "aspect-[16/10] col-span-2 lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[28rem]"
                      : "aspect-[4/3]"
                  }`}
                >
                  <Image
                    src={photo.url}
                    alt={photo.alt || post.title}
                    fill
                    priority={index < 2}
                    className="object-cover"
                    sizes={
                      featured
                        ? "(max-width: 1024px) 100vw, 66vw"
                        : "(max-width: 640px) 50vw, 33vw"
                    }
                  />
                </li>
              );
            })}
          </ul>
          <PhotographerCredit post={post} className="mt-4" />
        </section>
      ) : null}

      {body ? (
        <div
          className="wedding-body mt-10 max-w-2xl text-sm leading-relaxed text-muted [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_p]:mt-3 [&_p:first-child]:mt-0"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : null}
    </article>
  );
}
