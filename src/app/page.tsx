import { MixList } from "@/components/MixList";
import { getFeaturedMixes } from "@/lib/mixes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { mixes, categoryOrder } = await getFeaturedMixes();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="fade-up mesh-panel border border-white/10 px-4 py-2 sm:px-8 sm:py-4">
        {mixes.length === 0 ? (
          <p className="py-8 text-zinc-400">
            No mixes are visible yet. Manage them at{" "}
            <a
              href="/admin/mixes"
              className="text-white underline-offset-4 hover:underline"
            >
              /admin/mixes
            </a>
            .
          </p>
        ) : (
          <MixList mixes={mixes} categoryOrder={categoryOrder} />
        )}
      </div>

      <div className="fade-up-delay mt-14 flex flex-col gap-4 border-t border-white/10 pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
          Looking for a wedding, private party, or destination event? Book DJ
          Ontic for your next night.
        </p>
        <a
          href="https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center bg-white px-6 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-steel"
        >
          Book Now
        </a>
      </div>
    </section>
  );
}
