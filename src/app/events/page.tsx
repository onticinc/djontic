import type { Metadata } from "next";
import { EventList } from "@/components/EventList";
import { PageHero } from "@/components/PageHero";
import { getUpcomingEvents } from "@/lib/notion";

export const metadata: Metadata = {
  title: "Upcoming Events",
  description:
    "See where DJ Ontic is playing next across Sun Valley, Park City, Jackson Hole, and Chelan.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const { events, configured, error } = await getUpcomingEvents();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHero
        eyebrow="On the calendar"
        title="Upcoming Events"
        description="Live dates from the Ontic events calendar — destination parties, residencies, and weddings across the mountain west."
      />

      <div className="mt-12">
        {!configured ? (
          <p className="border-t border-white/10 py-10 text-zinc-400">
            Connect Notion by adding{" "}
            <code className="text-zinc-200">NOTION_API_KEY</code> and{" "}
            <code className="text-zinc-200">NOTION_DATABASE_ID</code> to your{" "}
            <code className="text-zinc-200">.env</code> file, then share the
            events database with your Notion integration.
          </p>
        ) : error ? (
          <p className="border-t border-white/10 py-10 text-zinc-400">
            Couldn’t load events from Notion: {error}
          </p>
        ) : (
          <EventList events={events} />
        )}
      </div>
    </section>
  );
}
