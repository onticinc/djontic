"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { AdminGate } from "@/components/AdminGate";

const SECTIONS = [
  {
    href: "/admin/mixes",
    label: "Mixes",
    description:
      "Order, visibility, categories, cover images, and Google Drive sync.",
  },
  {
    href: "/admin/events",
    label: "Events",
    description: "Upcoming dates, venues, cities, and states.",
  },
  {
    href: "/admin/weddings",
    label: "Weddings",
    description: "Wedding recaps with rich text, photos, and video links.",
  },
] as const;

function AdminDashboardPanel() {
  const { signOut } = useAuthActions();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex h-11 items-center px-3 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
        >
          Log out
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block h-full border border-white/10 bg-zinc-900 px-5 py-6 transition hover:border-white/25 hover:bg-zinc-800"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-steel">
                Manage
              </p>
              <h2 className="mt-3 font-display text-xl tracking-[0.06em] text-white">
                {section.label}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {section.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <AdminGate unlockLabel="site controls">
      <AdminDashboardPanel />
    </AdminGate>
  );
}
