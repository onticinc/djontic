import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const photoValidator = v.object({
  id: v.string(),
  url: v.string(),
  alt: v.string(),
});

const videoValidator = v.object({
  id: v.string(),
  url: v.string(),
  provider: v.union(
    v.literal("youtube"),
    v.literal("vimeo"),
    v.literal("other"),
  ),
});

const weddingValidator = v.object({
  slug: v.string(),
  title: v.string(),
  date: v.string(),
  location: v.string(),
  city: v.string(),
  state: v.string(),
  excerpt: v.string(),
  bodyHtml: v.string(),
  coverUrl: v.union(v.string(), v.null()),
  photographerName: v.optional(v.string()),
  photographerUrl: v.optional(v.union(v.string(), v.null())),
  photos: v.array(photoValidator),
  videos: v.array(videoValidator),
  published: v.boolean(),
});

function formatWeddingDate(iso: string): string {
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

function toPublic(post: {
  _id: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  city: string;
  state: string;
  excerpt: string;
  bodyHtml: string;
  coverUrl: string | null;
  photographerName?: string;
  photographerUrl?: string | null;
  photos: Array<{ id: string; url: string; alt: string }>;
  videos: Array<{
    id: string;
    url: string;
    provider: "youtube" | "vimeo" | "other";
  }>;
}) {
  return {
    id: post._id,
    slug: post.slug,
    title: post.title,
    date: post.date,
    dateLabel: formatWeddingDate(post.date),
    location: post.location,
    city: post.city,
    state: post.state,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    coverUrl: post.coverUrl,
    photographerName: post.photographerName?.trim() || "",
    photographerUrl: post.photographerUrl?.trim() || null,
    photos: post.photos,
    videos: post.videos,
  };
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("weddings").collect();
    return posts
      .filter((post) => post.published)
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
      .map(toPublic);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("weddings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!post || !post.published) return null;
    return toPublic(post);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const posts = await ctx.db.query("weddings").collect();
    return posts
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
      .map((post) => ({
        id: post._id,
        slug: post.slug,
        title: post.title,
        date: post.date,
        location: post.location,
        city: post.city,
        state: post.state,
        excerpt: post.excerpt,
        bodyHtml: post.bodyHtml,
        coverUrl: post.coverUrl,
        photographerName: post.photographerName ?? "",
        photographerUrl: post.photographerUrl ?? null,
        photos: post.photos,
        videos: post.videos,
        published: post.published,
        updatedAt: post.updatedAt,
      }));
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("weddings")),
    post: weddingValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const updatedAt = new Date().toISOString();
    const slugOwner = await ctx.db
      .query("weddings")
      .withIndex("by_slug", (q) => q.eq("slug", args.post.slug))
      .unique();

    if (args.id) {
      if (slugOwner && slugOwner._id !== args.id) {
        throw new Error("Slug already in use.");
      }
      await ctx.db.patch(args.id, { ...args.post, updatedAt });
      return args.id;
    }

    if (slugOwner) {
      throw new Error("Slug already in use.");
    }
    return await ctx.db.insert("weddings", { ...args.post, updatedAt });
  },
});

export const remove = mutation({
  args: { id: v.id("weddings") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const replaceAll = mutation({
  args: { posts: v.array(weddingValidator) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("weddings").collect();
    for (const post of existing) {
      await ctx.db.delete(post._id);
    }
    const updatedAt = new Date().toISOString();
    for (const post of args.posts) {
      await ctx.db.insert("weddings", { ...post, updatedAt });
    }
  },
});

const destinationValidator = v.object({
  label: v.string(),
  text: v.string(),
});

export const defaultPageSettings = {
  heroEyebrow: "Destination celebrations",
  heroTitle: "Weddings",
  heroDescription:
    "From mountain lodges to lakeside receptions — reading the room, building the night, and keeping the dance floor full.",
  recapsTitle: "Wedding Recaps",
  recapsDescription:
    "Photos and films from celebrations across the mountain west.",
  whereTitle: "Regular Destinations",
  destinations: [
    { label: "", text: "Sun Valley" },
    { label: "", text: "Park City" },
    { label: "", text: "Jackson Hole" },
    { label: "", text: "Chelan, Washington" },
  ],
  approachTitle: "The Approach",
  approachBody:
    "Every wedding gets a custom set built around your guests, timeline, and taste — ceremony walk-ins, cocktail-hour polish, dinner energy, and a reception that never plateaus. No cookie-cutter playlists.\n\nCoordination with planners, venues, and A/V teams is part of the process so the night stays seamless from first look to last song.",
  bookingTitle: "Reserve your date",
  bookingDescription:
    "Peak season books early. Share your venue, guest count, and preferred timeline to get started.",
  bookingLabel: "Book a Wedding",
  bookingUrl:
    "https://onticllc.notion.site/161b4a65404b425eb24340a8459a9958",
};

export const getPageSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("weddingPageSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
      .unique();
    if (!settings) {
      return { ...defaultPageSettings, updatedAt: new Date().toISOString() };
    }

    const looksLegacy =
      settings.whereTitle === "Where We Play" ||
      settings.destinations.some(
        (item) =>
          item.label === "Home base" ||
          item.label === "Regular destinations" ||
          item.label === "Also available" ||
          item.text.includes("Park City · Jackson Hole · Chelan"),
      );

    return {
      heroEyebrow: settings.heroEyebrow,
      heroTitle: settings.heroTitle,
      heroDescription: settings.heroDescription,
      recapsTitle: settings.recapsTitle,
      recapsDescription: settings.recapsDescription,
      whereTitle: looksLegacy
        ? defaultPageSettings.whereTitle
        : settings.whereTitle,
      destinations: looksLegacy
        ? defaultPageSettings.destinations
        : settings.destinations,
      approachTitle: settings.approachTitle,
      approachBody: settings.approachBody,
      bookingTitle: settings.bookingTitle,
      bookingDescription: settings.bookingDescription,
      bookingLabel: settings.bookingLabel,
      bookingUrl: settings.bookingUrl,
      updatedAt: settings.updatedAt,
    };
  },
});

export const savePageSettings = mutation({
  args: {
    heroEyebrow: v.string(),
    heroTitle: v.string(),
    heroDescription: v.string(),
    recapsTitle: v.string(),
    recapsDescription: v.string(),
    whereTitle: v.string(),
    destinations: v.array(destinationValidator),
    approachTitle: v.string(),
    approachBody: v.string(),
    bookingTitle: v.string(),
    bookingDescription: v.string(),
    bookingLabel: v.string(),
    bookingUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const destinations = args.destinations
      .map((item) => ({
        label: item.label.trim(),
        text: item.text.trim(),
      }))
      .filter((item) => item.label || item.text);
    const payload = {
      singleton: "default" as const,
      heroEyebrow: args.heroEyebrow.trim(),
      heroTitle: args.heroTitle.trim(),
      heroDescription: args.heroDescription.trim(),
      recapsTitle: args.recapsTitle.trim(),
      recapsDescription: args.recapsDescription.trim(),
      whereTitle: args.whereTitle.trim(),
      destinations,
      approachTitle: args.approachTitle.trim(),
      approachBody: args.approachBody.trim(),
      bookingTitle: args.bookingTitle.trim(),
      bookingDescription: args.bookingDescription.trim(),
      bookingLabel: args.bookingLabel.trim(),
      bookingUrl: args.bookingUrl.trim(),
      updatedAt: new Date().toISOString(),
    };
    const existing = await ctx.db
      .query("weddingPageSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("weddingPageSettings", payload);
  },
});
