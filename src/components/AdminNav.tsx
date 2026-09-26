import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Dashboard", key: "dashboard" },
  { href: "/admin/mixes", label: "Mixes", key: "mixes" },
  { href: "/admin/events", label: "Events", key: "events" },
  { href: "/admin/weddings", label: "Weddings", key: "weddings" },
] as const;

export function AdminNav({
  current,
}: {
  current: "dashboard" | "mixes" | "events" | "weddings";
}) {
  return (
    <nav className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
      {LINKS.map((item, index) => {
        const active = item.key === current;
        return (
          <span key={item.href} className="flex items-center gap-3">
            {index > 0 ? <span aria-hidden="true">·</span> : null}
            <Link
              href={item.href}
              className={
                active
                  ? "text-white"
                  : "text-zinc-500 underline-offset-4 hover:text-white hover:underline"
              }
            >
              {item.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
