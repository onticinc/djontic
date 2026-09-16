export type EventRecord = {
  id: string;
  name: string;
  date: string;
  location: string;
  city: string;
  state: string;
};

export type EventsStore = {
  updatedAt: string;
  events: EventRecord[];
};

export type PublicEvent = {
  id: string;
  name: string;
  date: string;
  dateLabel: string;
  location: string;
  city: string;
  state: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

export function formatEventDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Boise",
  }).format(date);
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boise",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function sortEvents(events: EventRecord[], today = todayIsoDate()): EventRecord[] {
  return [...events].sort((a, b) => {
    const aPast = a.date < today;
    const bPast = b.date < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aPast) return b.date.localeCompare(a.date) || a.name.localeCompare(b.name);
    return a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
  });
}

export function normalizeEvent(
  raw: Record<string, unknown>,
): EventRecord | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const location = typeof raw.location === "string" ? raw.location.trim() : "";
  const city = typeof raw.city === "string" ? raw.city.trim() : "";
  const state = typeof raw.state === "string" ? raw.state.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  if (!name || !location || !city || !state || !isIsoDate(date)) return null;

  const id =
    typeof raw.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : crypto.randomUUID();

  return { id, name, date, location, city, state };
}
