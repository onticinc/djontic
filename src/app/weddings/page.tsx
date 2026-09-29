import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
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
  "2023-wedding-season-june-july",
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
  const topIds = new Set(topPosts.map((post) => post.id));
  const bottomPosts = posts
    .filter((post) => !topIds.has(post.id))
    .slice(0, SECTION_SIZE);
  const approachParagraphs = page.approachBody
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <PageHero
          eyebrow={page.heroEyebrow || undefined}
          title={page.heroTitle}
          description={page.heroDescription}
        />

        <div className="mt-14">
          <h2 className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
            {page.recapsTitle}
          </h2>
          {page.recapsDescription ? (
            <p className="mt-3 max-w-2xl text-sm text-muted">
              {page.recapsDescription}
            </p>
          ) : null}
          {topPosts.length > 0 ? (
            <div className="mt-8">
              <WeddingRecapList posts={topPosts} layout="showcase" />
            </div>
          ) : (
            <p className="mt-8 text-muted">
              Wedding photos will appear here soon.
            </p>
          )}
        </div>
      </section>

      <div className="mesh-panel w-full border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
            {page.whereTitle}
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {page.destinations.map((destination) => (
              <li key={`${destination.label}:${destination.text}`}>
                <span className="block text-xs uppercase tracking-[0.18em] text-steel">
                  {destination.label}
                </span>
                <p className="mt-2 text-base text-muted sm:text-lg">
                  {destination.text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        {bottomPosts.length > 0 ? (
          <div className="mb-20">
            <WeddingRecapList posts={bottomPosts} />
          </div>
        ) : null}

        <div className="border-t border-border pt-12">
          <h2 className="font-display text-2xl tracking-[0.06em] text-foreground sm:text-3xl">
            {page.approachTitle}
          </h2>
          <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-muted sm:text-base">
            {approachParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
          </div>
        </div>
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
    </>
  );
}
