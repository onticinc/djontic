import Image from "next/image";
import Link from "next/link";
import type { PublicWeddingPost } from "@/lib/wedding-types";

export function WeddingRecapList({ posts }: { posts: PublicWeddingPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="border-t border-border py-10 text-muted">
        Wedding recaps will appear here soon.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {posts.map((post) => {
        const place = [post.city, post.state].filter(Boolean).join(", ");
        return (
          <li key={post.id} className="py-10">
            <Link href={`/weddings/${post.slug}`} className="group block">
              <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-start">
                {post.coverUrl ? (
                  <div className="relative aspect-[4/3] overflow-hidden border border-border bg-surface">
                    <Image
                      src={post.coverUrl}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 240px"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] border border-border bg-surface" />
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-steel">
                    {post.dateLabel}
                  </p>
                  <h3 className="mt-2 font-display text-3xl tracking-[0.06em] text-foreground transition group-hover:text-steel sm:text-4xl">
                    {post.title}
                  </h3>
                  {(post.location || place) && (
                    <p className="mt-2 text-sm text-muted">
                      {[post.location, place].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {post.excerpt ? (
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-2">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-foreground underline-offset-4 group-hover:underline">
                    Read recap
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
