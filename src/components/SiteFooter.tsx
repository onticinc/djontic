import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl tracking-[0.18em] text-white">
            DJ ONTIC
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Based in Sun Valley, Idaho. Playing events across Park City,
            Jackson Hole, and Chelan, Washington.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
          <a
            href="https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white"
          >
            Book
          </a>
          <Link href="/events" className="hover:text-white">
            Events
          </Link>
          <Link href="/weddings" className="hover:text-white">
            Weddings
          </Link>
          <Link href="/podcast" className="hover:text-white">
            Eggs Podcast
          </Link>
        </div>
      </div>
    </footer>
  );
}
