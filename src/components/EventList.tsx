import type { PublicEvent } from "@/lib/event-types";

export function EventList({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="border-t border-white/10 py-10 text-zinc-400">
        No upcoming events posted yet. Check back soon.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 border-t border-white/10">
      {events.map((event) => (
        <li key={event.id} className="py-8">
          <p className="text-xs uppercase tracking-[0.2em] text-steel">
            {event.dateLabel}
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.06em] text-white sm:text-4xl">
            {event.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
            <p>{event.location}</p>
            <p>
              {event.city}, {event.state}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
