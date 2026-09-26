import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const eventValidator = v.object({
  date: v.string(),
  name: v.string(),
  location: v.string(),
  city: v.string(),
  state: v.string(),
});

function todayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Boise",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

export const listUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const today = todayIsoDate();
    const events = await ctx.db.query("events").collect();
    return events
      .filter((event) => event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
      .map((event) => ({
        id: event._id,
        name: event.name,
        date: event.date,
        dateLabel: formatEventDate(event.date),
        location: event.location,
        city: event.city,
        state: event.state,
      }));
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").collect();
    const today = todayIsoDate();
    return events
      .sort((a, b) => {
        const aPast = a.date < today;
        const bPast = b.date < today;
        if (aPast !== bPast) return aPast ? 1 : -1;
        if (aPast) return b.date.localeCompare(a.date) || a.name.localeCompare(b.name);
        return a.date.localeCompare(b.date) || a.name.localeCompare(b.name);
      })
      .map((event) => ({
        id: event._id,
        name: event.name,
        date: event.date,
        location: event.location,
        city: event.city,
        state: event.state,
      }));
  },
});

export const replaceAll = mutation({
  args: { events: v.array(eventValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("events").collect();
    for (const event of existing) {
      await ctx.db.delete(event._id);
    }
    for (const event of args.events) {
      await ctx.db.insert("events", event);
    }
  },
});
