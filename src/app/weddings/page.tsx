import type { Metadata } from "next";
import { WeddingRecapList } from "@/components/WeddingRecapList";
import {
  getPublishedWeddingPosts,
  getWeddingPageSettings,
} from "@/lib/weddings";

export const metadata: Metadata = {
  title: "Weddings",
  description:
    "Wedding DJ services with DJ Ontic in Sun Valley, Park City, Jackson Hole, and Chelan.",
};

export const dynamic = "force-dynamic";

const SECTION_SIZE = 4;
const TOP_SHOWCASE_SLUGS = [
  "sam-david-wedding",
  "jessica-and-david-wedding",
  "helle-russell-wedding",
  "siren-songs-winery",
] as const;

function pickTopShowcase(
  posts: Awaited<ReturnType<typeof getPublishedWeddingPosts>>,
) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const top: typeof posts = [];
  for (const slug of TOP_SHOWCASE_SLUGS) {
    const post = bySlug.get(slug);
    if (post) top.push(post);
  }
  if (top.length < SECTION_SIZE) {
    for (const post of posts) {
      if (top.some((item) => item.id === post.id)) continue;
      top.push(post);
      if (top.length >= SECTION_SIZE) break;
    }
  }
  return top.slice(0, SECTION_SIZE);
}

export default async function WeddingsPage() {
  const [posts, page] = await Promise.all([
    getPublishedWeddingPosts(),
    getWeddingPageSettings(),
  ]);
  const topPosts = pickTopShowcase(posts);
  const featuredPosts = topPosts.slice(0, 2);
  const midPosts = topPosts.slice(2);
  const topIds = new Set(topPosts.map((post) => post.id));
  const bottomPosts = posts
    .filter((post) => !topIds.has(post.id))
    .slice(0, SECTION_SIZE);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:pb-10 sm:pt-20">
        <h1 className="font-display text-3xl tracking-[0.06em] text-foreground sm:text-4xl">
          {page.recapsTitle}
        </h1>
        {featuredPosts.length > 0 ? (
          <div className="mt-8">
            <WeddingRecapList posts={featuredPosts} layout="showcase" />
          </div>
        ) : (
          <p className="mt-8 text-muted">
            Wedding photos will appear here soon.
          </p>
        )}
      </section>

      <div className="mesh-panel w-full border-y border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-14">
          <div>
            <h2 className="font-display text-xl tracking-[0.06em] text-foreground">
              {page.bookingTitle}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              {page.bookingDescription}
            </p>
          </div>
          <a
            href={page.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-foreground px-6 text-xs font-semibold uppercase tracking-[0.18em] text-background transition hover:opacity-80"
          >
            {page.bookingLabel}
          </a>
        </div>
      </div>

      {midPosts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <WeddingRecapList posts={midPosts} />
        </section>
      ) : null}

      <div className="mesh-panel w-full border-y border-border">
        <div className="w-full px-4 py-12 sm:px-8 sm:py-16">
          <h2 className="text-center font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
            {page.whereTitle}
          </h2>
          <p className="mx-auto mt-8 max-w-none text-center text-lg tracking-[0.04em] text-muted sm:text-2xl">
            {page.destinations
              .map((destination) => destination.text.trim())
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {bottomPosts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <WeddingRecapList posts={bottomPosts} />
        </section>
      ) : null}
    </>
  );
}
