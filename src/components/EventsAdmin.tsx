"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sortEvents,
  todayIsoDate,
  type EventRecord,
  type EventsStore,
} from "@/lib/event-types";

const EMPTY_DRAFT = {
  date: "",
  name: "",
  location: "",
  city: "",
  state: "",
};

export function EventsAdmin() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => sortEvents(events), [events]);

  const today = todayIsoDate();

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/login");
      const data = (await response.json()) as {
        configured: boolean;
        authenticated: boolean;
      };
      setConfigured(data.configured);
      setAuthenticated(data.authenticated);
      if (data.authenticated) {
        await loadEvents();
      }
    })();
  }, []);

  async function loadEvents() {
    const response = await fetch("/api/admin/events");
    if (!response.ok) {
      setAuthenticated(false);
      return;
    }
    const data = (await response.json()) as EventsStore;
    setEvents(data.events);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error || "Login failed");
        return;
      }
      setAuthenticated(true);
      setPassword("");
      await loadEvents();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthenticated(false);
    setEvents([]);
  }

  async function save(nextEvents: EventRecord[], successMessage = "Saved") {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: nextEvents }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error || "Save failed");
        return false;
      }
      const next = data as EventsStore;
      setEvents(next.events);
      setStatus(successMessage);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function addEvent() {
    const name = draft.name.trim();
    const location = draft.location.trim();
    const city = draft.city.trim();
    const state = draft.state.trim();
    const date = draft.date.trim();
    if (!name || !location || !city || !state || !date) {
      setStatus("Date, event name, location, city, and state are required.");
      return;
    }

    const nextEvents = [
      ...events,
      { id: crypto.randomUUID(), name, date, location, city, state },
    ];
    const saved = await save(nextEvents, "Event added.");
    if (saved) setDraft(EMPTY_DRAFT);
  }

  function updateEvent(id: string, patch: Partial<EventRecord>) {
    setEvents((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((item) => item.id !== id));
    setStatus("Event removed — save to publish the change.");
  }

  if (!configured) {
    return (
      <p className="text-zinc-400">
        Set <code className="text-zinc-200">ADMIN_PASSWORD</code> in{" "}
        <code className="text-zinc-200">.env</code> to unlock the events admin.
      </p>
    );
  }

  if (!authenticated) {
    return (
      <form onSubmit={login} className="max-w-sm space-y-4">
        <label className="block text-sm text-zinc-400">
          Admin password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border border-white/15 bg-black px-3 py-2 text-white outline-none focus:border-white/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          Sign in
        </button>
        {status ? <p className="text-sm text-red-300">{status}</p> : null}
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(events)}
          className="inline-flex h-11 items-center bg-white px-5 text-xs font-semibold uppercase tracking-[0.16em] text-black disabled:opacity-50"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex h-11 items-center px-3 text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
        >
          Log out
        </button>
      </div>

      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}

      <form
        className="grid gap-4 border border-white/10 bg-zinc-900 px-4 py-5 sm:grid-cols-2 xl:grid-cols-[140px_1fr_1fr_1fr_90px_auto] xl:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void addEvent();
        }}
      >
        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          Date
          <input
            type="date"
            required
            value={draft.date}
            onChange={(event) =>
              setDraft((current) => ({ ...current, date: event.target.value }))
            }
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          Event name
          <input
            type="text"
            required
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          Location
          <input
            type="text"
            required
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          City
          <input
            type="text"
            required
            value={draft.city}
            onChange={(event) =>
              setDraft((current) => ({ ...current, city: event.target.value }))
            }
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.16em] text-zinc-500">
          State
          <input
            type="text"
            required
            value={draft.state}
            onChange={(event) =>
              setDraft((current) => ({ ...current, state: event.target.value }))
            }
            className="mt-2 w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 items-center justify-center border border-white/25 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 disabled:opacity-50 sm:col-span-2 xl:col-span-1"
        >
          Add event
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="border-t border-white/10 py-8 text-sm text-zinc-500">
          No events yet. Add a date, name, location, city, and state above.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((event) => {
            const past = event.date < today;
            return (
              <li
                key={event.id}
                className="grid gap-3 border border-white/10 bg-zinc-900 px-4 py-4 sm:grid-cols-2 xl:grid-cols-[140px_1fr_1fr_1fr_90px_auto] xl:items-center"
              >
                <label className="sr-only" htmlFor={`event-date-${event.id}`}>
                  Date for {event.name || "event"}
                </label>
                <input
                  id={`event-date-${event.id}`}
                  type="date"
                  value={event.date}
                  onChange={(change) =>
                    updateEvent(event.id, { date: change.target.value })
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
                />
                <label className="sr-only" htmlFor={`event-name-${event.id}`}>
                  Name for {event.name || "event"}
                </label>
                <input
                  id={`event-name-${event.id}`}
                  type="text"
                  value={event.name}
                  onChange={(change) =>
                    updateEvent(event.id, { name: change.target.value })
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <label className="sr-only" htmlFor={`event-location-${event.id}`}>
                  Location for {event.name || "event"}
                </label>
                <input
                  id={`event-location-${event.id}`}
                  type="text"
                  value={event.location}
                  onChange={(change) =>
                    updateEvent(event.id, { location: change.target.value })
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <label className="sr-only" htmlFor={`event-city-${event.id}`}>
                  City for {event.name || "event"}
                </label>
                <input
                  id={`event-city-${event.id}`}
                  type="text"
                  value={event.city ?? ""}
                  onChange={(change) =>
                    updateEvent(event.id, { city: change.target.value })
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <label className="sr-only" htmlFor={`event-state-${event.id}`}>
                  State for {event.name || "event"}
                </label>
                <input
                  id={`event-state-${event.id}`}
                  type="text"
                  value={event.state ?? ""}
                  onChange={(change) =>
                    updateEvent(event.id, { state: change.target.value })
                  }
                  className="w-full border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
                />
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  {past ? (
                    <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Past
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeEvent(event.id)}
                    className="text-xs uppercase tracking-[0.16em] text-zinc-500 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
