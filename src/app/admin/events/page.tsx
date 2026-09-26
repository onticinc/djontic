import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminNav";
import { EventsAdmin } from "@/components/EventsAdmin";

export const metadata: Metadata = {
  title: "Manage Events",
  robots: { index: false, follow: false },
};

export default function AdminEventsPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-steel">Backend</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
          Manage Events
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Add upcoming dates with an event name, location, city, and state. The
          public events page shows today and later. Changes save directly to
          Convex.
        </p>
        <AdminNav current="events" />
      </div>

      <div className="mt-10">
        <EventsAdmin />
      </div>
    </section>
  );
}
