import type { PublicEvent } from "@/lib/event-types";

type EventMonthGroup = {
  key: string;
  label: string;
  events: PublicEvent[];
};

type EventYearGroup = {
  year: string;
  months: EventMonthGroup[];
};

function formatMonth(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "America/Boise",
  }).format(date);
}

function formatDayMonth(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Boise",
  }).format(date);
}

function groupEventsByYearAndMonth(events: PublicEvent[]): EventYearGroup[] {
  const years: EventYearGroup[] = [];
  const yearIndex = new Map<string, number>();
  const monthIndex = new Map<string, number>();

  for (const event of events) {
    const year = event.date.slice(0, 4);
    const monthKey = event.date.slice(0, 7);

    let yearGroup = years[yearIndex.get(year) ?? -1];
    if (!yearGroup) {
      yearIndex.set(year, years.length);
      yearGroup = { year, months: [] };
      years.push(yearGroup);
    }

    const existingMonth = monthIndex.get(monthKey);
    if (existingMonth === undefined) {
      monthIndex.set(monthKey, yearGroup.months.length);
      yearGroup.months.push({
        key: monthKey,
        label: formatMonth(event.date),
        events: [event],
      });
    } else {
      yearGroup.months[existingMonth].events.push(event);
    }
  }

  return years;
}

export function EventList({ events }: { events: PublicEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="border-t border-border py-10 text-muted">
        No upcoming events posted yet. Check back soon.
      </p>
    );
  }

  const years = groupEventsByYearAndMonth(events);

  return (
    <div className="bg-background">
      {years.map((yearGroup, yearIndex) => (
        <div key={yearGroup.year}>
          <p
            className={`mb-6 text-center font-display text-lg uppercase tracking-[0.18em] text-steel sm:text-xl ${
              yearIndex > 0 ? "mt-10" : ""
            }`}
          >
            - {yearGroup.year} -
          </p>

          {yearGroup.months.map((group, monthIndex) => (
            <section
              key={group.key}
              className={
                monthIndex === 0
                  ? undefined
                  : "mt-10 border-t border-border pt-8"
              }
            >
              <h2 className="font-display text-2xl font-semibold tracking-[0.1em] text-muted-2 sm:text-3xl">
                {group.label}
              </h2>
              <ul className="mt-4 space-y-3">
                {group.events.map((event) => (
                  <li
                    key={event.id}
                    className="border border-border bg-surface px-4 py-5 sm:px-6 sm:py-6"
                  >
                    <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-display text-2xl tracking-[0.04em] text-foreground sm:text-3xl">
                      <span>{formatDayMonth(event.date)}</span>
                      <span aria-hidden="true" className="text-muted-2">
                        –
                      </span>
                      <span>{event.location}</span>
                      <span aria-hidden="true" className="text-muted-2">
                        –
                      </span>
                      <span>
                        {event.city}, {event.state}
                      </span>
                    </p>
                    <h3 className="mt-1.5 text-lg tracking-[0.02em] text-muted sm:text-xl">
                      {event.name}
                    </h3>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
