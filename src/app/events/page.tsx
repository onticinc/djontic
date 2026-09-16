import type { Metadata } from "next";
import { EventList } from "@/components/EventList";
import { PageHero } from "@/components/PageHero";
import { getUpcomingEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Upcoming Events",
  description:
    "See where DJ Ontic is playing next across Sun Valley, Park City, Jackson Hole, and Chelan.",
};

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getUpcomingEvents();

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <PageHero
        eyebrow="On the calendar"
        title="Upcoming Events"
        description="Destination parties, residencies, and weddings across the mountain west."
      />

      <div className="mt-12">
        <EventList events={events} />
      </div>
    </section>
  );
}
