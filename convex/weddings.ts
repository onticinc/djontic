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
