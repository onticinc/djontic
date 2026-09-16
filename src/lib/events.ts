import { promises as fs } from "fs";
import path from "path";
import {
  formatEventDate,
  normalizeEvent,
  sortEvents,
  todayIsoDate,
  type EventRecord,
  type EventsStore,
  type PublicEvent,
} from "./event-types";

export type { EventRecord, EventsStore, PublicEvent };
export { formatEventDate, normalizeEvent, sortEvents, todayIsoDate };

const DATA_PATH = path.join(process.cwd(), "data", "events.json");

export async function readEventsStore(): Promise<EventsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      updatedAt?: string;
      events?: Array<Record<string, unknown>>;
    };
    const events = sortEvents(
      (parsed.events ?? [])
        .map((item) => normalizeEvent(item))
        .filter((item): item is EventRecord => item !== null),
    );
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      events,
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      events: [],
    };
  }
}

export async function writeEventsStore(store: EventsStore): Promise<void> {
  const next: EventsStore = {
    updatedAt: new Date().toISOString(),
    events: sortEvents(store.events),
  };
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export async function getUpcomingEvents(): Promise<PublicEvent[]> {
  const store = await readEventsStore();
  const today = todayIsoDate();
  return store.events
    .filter((event) => event.date >= today)
    .map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      dateLabel: formatEventDate(event.date),
      location: event.location,
      city: event.city,
      state: event.state,
    }));
}
