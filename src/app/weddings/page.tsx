import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = {
  title: "Weddings",
  description:
    "Wedding DJ services with DJ Ontic in Sun Valley, Park City, Jackson Hole, and Chelan.",
};

export default function WeddingsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHero
        eyebrow="Destination celebrations"
        title="Weddings"
        description="From mountain lodges to lakeside receptions — reading the room, building the night, and keeping the dance floor full."
      />

      <div className="mt-12 grid gap-12 border-t border-white/10 pt-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">
            The Approach
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Every wedding gets a custom set built around your guests, timeline,
            and taste — ceremony walk-ins, cocktail-hour polish, dinner energy,
            and a reception that never plateaus. No cookie-cutter playlists.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Coordination with planners, venues, and A/V teams is part of the
            process so the night stays seamless from first look to last song.
          </p>
        </div>

        <div>
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">
            Where We Play
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-zinc-300 sm:text-base">
            <li className="border-b border-white/10 pb-4">
              <span className="block text-xs uppercase tracking-[0.18em] text-steel">
                Home base
              </span>
              Sun Valley, Idaho
            </li>
            <li className="border-b border-white/10 pb-4">
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

      <div className="mt-16 flex flex-col gap-5 mesh-panel border border-white/10 px-6 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">
            Reserve your date
          </h2>
          <p className="mt-2 max-w-lg text-sm text-zinc-400">
            Peak season books early. Share your venue, guest count, and
            preferred timeline to get started.
          </p>
        </div>
        <a
          href="https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 shrink-0 items-center justify-center bg-white px-6 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-steel"
        >
          Book a Wedding
        </a>
      </div>
    </section>
  );
}
