import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { WeddingRecapList } from "@/components/WeddingRecapList";
import { getPublishedWeddingPosts } from "@/lib/weddings";

export const metadata: Metadata = {
  title: "Weddings",
  description:
    "Wedding DJ services with DJ Ontic in Sun Valley, Park City, Jackson Hole, and Chelan.",
};

export const dynamic = "force-dynamic";

export default async function WeddingsPage() {
  const posts = await getPublishedWeddingPosts();
  const bookingUrl =
    process.env.NEXT_PUBLIC_BOOKING_URL ??
    "https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958";

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <PageHero
          eyebrow="Destination celebrations"
          title="Weddings"
          description="From mountain lodges to lakeside receptions — reading the room, building the night, and keeping the dance floor full."
        />

        <div className="mt-12 grid gap-12 border-t border-border pt-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl tracking-[0.08em] text-foreground">
              The Approach
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Every wedding gets a custom set built around your guests, timeline,
              and taste — ceremony walk-ins, cocktail-hour polish, dinner energy,
              and a reception that never plateaus. No cookie-cutter playlists.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Coordination with planners, venues, and A/V teams is part of the
              process so the night stays seamless from first look to last song.
            </p>
          </div>

          <div>
            <h2 className="font-display text-3xl tracking-[0.08em] text-foreground">
              Where We Play
            </h2>
            <ul className="mt-4 space-y-4 text-sm text-muted sm:text-base">
              <li className="border-b border-border pb-4">
                <span className="block text-xs uppercase tracking-[0.18em] text-steel">
                  Home base
                </span>
                Sun Valley, Idaho
              </li>
              <li className="border-b border-border pb-4">
                <span className="block text-xs uppercase tracking-[0.18em] text-steel">
                  Regular destinations
                </span>
                Park City · Jackson Hole · Chelan, Washington
              </li>
              <li>
                <span className="block text-xs uppercase tracking-[0.18em] text-steel">
                  Also available
                </span>
                Travel weekends across the mountain west
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20">
          <h2 className="font-display text-4xl tracking-[0.08em] text-foreground sm:text-5xl">
            Wedding Recaps
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Recent celebrations — stories, photos, and moments from the dance
            floor.
          </p>
          <div className="mt-8">
            <WeddingRecapList posts={posts} />
          </div>
        </div>
      </section>

      <div className="mesh-panel w-full border-y border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-14">
          <div>
            <h2 className="font-display text-3xl tracking-[0.08em] text-foreground">
              Reserve your date
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Peak season books early. Share your venue, guest count, and
              preferred timeline to get started.
            </p>
          </div>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 shrink-0 items-center justify-center bg-foreground px-6 text-xs font-semibold uppercase tracking-[0.18em] text-background transition hover:opacity-80"
          >
            Book a Wedding
          </a>
        </div>
      </div>
    </>
  );
}
