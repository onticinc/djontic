"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const BOOKING_URL =
  "https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958";

const NAV = [
  { href: "/", label: "Mixes", external: false },
  { href: "/events", label: "Events", external: false },
  { href: "/podcast", label: "Eggs Podcast", external: false },
  { href: "/weddings", label: "Weddings", external: false },
  { href: BOOKING_URL, label: "Book", external: true },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3 sm:px-6">
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400 transition hover:text-white"
                >
                  {item.label}
                </a>
              );
            }

            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] transition ${
                  active
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex h-10 w-10 items-center justify-center text-zinc-300 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 bg-current transition ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`block h-0.5 w-5 bg-current transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <nav className="border-t border-white/10 px-4 py-4 md:hidden">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-2 py-3 text-sm uppercase tracking-[0.16em] text-zinc-300"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="block px-2 py-3 text-sm uppercase tracking-[0.16em] text-zinc-300"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
