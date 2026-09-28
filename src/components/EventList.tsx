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
  const showYearBreaks = years.length > 1;

  return (
    <div className="bg-background">
      {years.map((yearGroup, yearIndex) => (
        <div key={yearGroup.year}>
          {showYearBreaks && yearIndex > 0 ? (
            <p className="mt-10 mb-6 text-center font-display text-xl tracking-[0.16em] text-foreground sm:text-2xl">
              - {yearGroup.year} -
            </p>
          ) : null}

          {yearGroup.months.map((group, monthIndex) => {
            const isFirstAfterYearBreak =
              showYearBreaks && yearIndex > 0 && monthIndex === 0;

            return (
              <section
                key={group.key}
                className={
                  isFirstAfterYearBreak
                    ? undefined
                    : "mt-10 border-t border-border pt-8"
                }
              >
                <h2 className="font-display text-2xl tracking-[0.12em] text-muted-2 sm:text-3xl">
                  {group.label}
                </h2>
                <ul>
                  {group.events.map((event, eventIndex) => (
                    <li
                      key={event.id}
                      className={
                        eventIndex === 0
                          ? "pt-6 pb-8"
                          : "border-t border-border py-8"
                      }
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-steel">
                        {event.dateLabel}
                      </p>
                      <h3 className="mt-2 font-display text-3xl tracking-[0.06em] text-foreground sm:text-4xl">
                        {event.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                        <p>{event.location}</p>
                        <p>
                          {event.city}, {event.state}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}
