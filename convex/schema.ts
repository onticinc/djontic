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
    path: v.string(),
    visible: v.boolean(),
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
    photos: v.array(weddingPhoto),
    videos: v.array(weddingVideo),
    published: v.boolean(),
    updatedAt: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_date", ["date"]),

  playCounts: defineTable({
    mixKey: v.string(),
    count: v.number(),
  }).index("by_mixKey", ["mixKey"]),
});
