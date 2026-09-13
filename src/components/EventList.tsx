import type { EventItem } from "@/lib/notion";

export function EventList({ events }: { events: EventItem[] }) {
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
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-steel">
              {event.dateLabel}
            </p>
            {event.timeLabel ? (
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                {event.timeLabel}
              </p>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-3xl tracking-[0.06em] text-white sm:text-4xl">
            {event.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
            {event.eventType ? <p>{event.eventType}</p> : null}
            {event.location ? <p>{event.location}</p> : null}
          </div>
          {event.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
              {event.description}
            </p>
          ) : null}
          {event.url ? (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-xs uppercase tracking-[0.16em] text-white underline-offset-4 hover:underline"
            >
              Details
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
