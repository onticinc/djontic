import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const mixValidator = v.object({
  mixKey: v.string(),
  filename: v.string(),
  title: v.string(),
  driveId: v.union(v.string(), v.null()),
  resourceKey: v.optional(v.union(v.string(), v.null())),
  path: v.string(),
  visible: v.boolean(),
  order: v.number(),
  coverUrl: v.union(v.string(), v.null()),
  category: v.union(v.string(), v.null()),
});

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("mixSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
      .unique();
    return (
      settings ?? {
        singleton: "default" as const,
        folderUrl: "",
        categoryOrder: [] as string[],
        ignoredDriveIds: [] as string[],
        ignoredFilenames: [] as string[],
        updatedAt: new Date().toISOString(),
      }
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const mixes = await ctx.db.query("mixes").collect();
    return mixes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  },
});

export const listVisible = query({
  args: {},
  handler: async (ctx) => {
    const mixes = await ctx.db.query("mixes").collect();
    return mixes
      .filter((mix) => mix.visible)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  },
});

export const getByKey = query({
  args: { mixKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mixes")
      .withIndex("by_mixKey", (q) => q.eq("mixKey", args.mixKey))
      .unique();
  },
});

export const getAdminStore = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [mixes, settings] = await Promise.all([
      ctx.db.query("mixes").collect(),
      ctx.db
        .query("mixSettings")
        .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
        .unique(),
    ]);
    return {
      mixes: mixes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
      folderUrl: settings?.folderUrl ?? "",
      categoryOrder: settings?.categoryOrder ?? [],
      ignoredDriveIds: settings?.ignoredDriveIds ?? [],
      ignoredFilenames: settings?.ignoredFilenames ?? [],
      updatedAt: settings?.updatedAt ?? new Date().toISOString(),
    };
  },
});

export const replaceAll = mutation({
  args: {
    mixes: v.array(mixValidator),
    folderUrl: v.string(),
    categoryOrder: v.array(v.string()),
    ignoredDriveIds: v.array(v.string()),
    ignoredFilenames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("mixes").collect();
    for (const mix of existing) {
      await ctx.db.delete(mix._id);
    }
    for (const [index, mix] of args.mixes.entries()) {
      await ctx.db.insert("mixes", {
        ...mix,
        order: typeof mix.order === "number" ? mix.order : index,
      });
    }

    const settings = await ctx.db
      .query("mixSettings")
      .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
      .unique();
    const payload = {
      singleton: "default" as const,
      folderUrl: args.folderUrl,
      categoryOrder: args.categoryOrder,
      ignoredDriveIds: args.ignoredDriveIds,
      ignoredFilenames: args.ignoredFilenames,
      updatedAt: new Date().toISOString(),
    };
    if (settings) {
      await ctx.db.patch(settings._id, payload);
    } else {
      await ctx.db.insert("mixSettings", payload);
    }
  },
});
