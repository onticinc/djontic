import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
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

export async function getUpcomingEvents(): Promise<PublicEvent[]> {
  return await fetchQuery(api.events.listUpcoming, {});
}
