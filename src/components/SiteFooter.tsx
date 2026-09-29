import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-lg tracking-[0.14em] text-foreground">
            DJ ONTIC
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            Based in Sun Valley, Idaho. Playing events across Park City,
            Jackson Hole, and Chelan, Washington.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.16em] text-muted-2">
          <a
            href="https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            Book
          </a>
          <Link href="/events" className="hover:text-foreground">
            Events
          </Link>
          <Link href="/weddings" className="hover:text-foreground">
            Weddings
          </Link>
          <Link href="/podcast" className="hover:text-foreground">
            Eggs Podcast
          </Link>
        </div>
      </div>
    </footer>
  );
}
