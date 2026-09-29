import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const weddingPhoto = v.object({
  id: v.string(),
  url: v.string(),
  alt: v.string(),
});

const weddingVideo = v.object({
  id: v.string(),
  url: v.string(),
  provider: v.union(
    v.literal("youtube"),
    v.literal("vimeo"),
    v.literal("other"),
  ),
});

export default defineSchema({
  ...authTables,

  mixes: defineTable({
    mixKey: v.string(),
    filename: v.string(),
    title: v.string(),
    driveId: v.union(v.string(), v.null()),
    /** Required for legacy Drive files affected by the security update. */
    resourceKey: v.optional(v.union(v.string(), v.null())),
    path: v.string(),
    visible: v.boolean(),
    featured: v.optional(v.boolean()),
    order: v.number(),
    coverUrl: v.union(v.string(), v.null()),
    category: v.union(v.string(), v.null()),
  }).index("by_mixKey", ["mixKey"]),

  mixSettings: defineTable({
    singleton: v.literal("default"),
    folderUrl: v.string(),
    categoryOrder: v.array(v.string()),
    ignoredDriveIds: v.array(v.string()),
    ignoredFilenames: v.array(v.string()),
    updatedAt: v.string(),
  }).index("by_singleton", ["singleton"]),

  events: defineTable({
    date: v.string(),
    name: v.string(),
    location: v.string(),
    city: v.string(),
    state: v.string(),
  }).index("by_date", ["date"]),

  weddings: defineTable({
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
    photos: v.array(weddingPhoto),
    videos: v.array(weddingVideo),
    published: v.boolean(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_date", ["date"]),

  weddingPageSettings: defineTable({
    singleton: v.literal("default"),
    heroEyebrow: v.string(),
    heroTitle: v.string(),
    heroDescription: v.string(),
    recapsTitle: v.string(),
    recapsDescription: v.string(),
    whereTitle: v.string(),
    destinations: v.array(
      v.object({
        label: v.string(),
        text: v.string(),
      }),
    ),
    approachTitle: v.string(),
    approachBody: v.string(),
    bookingTitle: v.string(),
    bookingDescription: v.string(),
    bookingLabel: v.string(),
    bookingUrl: v.string(),
    updatedAt: v.string(),
  }).index("by_singleton", ["singleton"]),

  playCounts: defineTable({
    mixKey: v.string(),
    count: v.number(),
  }).index("by_mixKey", ["mixKey"]),
});
