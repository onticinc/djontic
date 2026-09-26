import Image from "next/image";
import type { PublicWeddingPost } from "@/lib/wedding-types";
import { videoEmbedUrl } from "@/lib/wedding-types";
import { sanitizeWeddingHtml } from "@/lib/sanitize-html";

export function WeddingRecapDetail({ post }: { post: PublicWeddingPost }) {
  const place = [post.city, post.state].filter(Boolean).join(", ");
  const body = sanitizeWeddingHtml(post.bodyHtml);

  return (
    <article>
      <p className="text-xs uppercase tracking-[0.2em] text-steel">
        {post.dateLabel}
      </p>
      <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white sm:text-6xl">
        {post.title}
      </h1>
      {(post.location || place) && (
        <p className="mt-4 text-sm text-zinc-400">
          {[post.location, place].filter(Boolean).join(" · ")}
        </p>
      )}

      {post.coverUrl ? (
        <div className="relative mt-10 aspect-[16/9] overflow-hidden border border-white/10 bg-zinc-900">
          <Image
            src={post.coverUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1152px) 100vw, 1152px"
          />
        </div>
      ) : null}

      {body ? (
        <div
          className="wedding-body mt-10 max-w-3xl text-base leading-relaxed text-zinc-300 [&_a]:text-white [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:text-zinc-400 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:tracking-[0.08em] [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:tracking-[0.08em] [&_h3]:text-white [&_img]:my-6 [&_img]:max-h-[32rem] [&_img]:w-full [&_img]:object-contain [&_li]:ml-5 [&_ol]:my-4 [&_ol]:list-decimal [&_p]:mt-4 [&_ul]:my-4 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : null}

      {post.photos.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">
            Photos
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {post.photos.map((photo) => (
              <li
                key={photo.id}
                className="relative aspect-[4/3] overflow-hidden border border-white/10 bg-zinc-900"
              >
                <Image
                  src={photo.url}
                  alt={photo.alt || ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {post.videos.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">
            Videos
          </h2>
          <ul className="mt-6 space-y-8">
            {post.videos.map((video) => {
              const embed = videoEmbedUrl(video);
              return (
                <li key={video.id}>
                  {embed ? (
                    <div className="aspect-video overflow-hidden border border-white/10 bg-black">
                      <iframe
                        src={embed}
                        title="Wedding video"
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
                      className="text-sm text-white underline underline-offset-4"
                    >
                      Watch video
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
