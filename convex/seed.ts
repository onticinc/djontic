import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * One-time import from legacy JSON payloads.
 * Run via: node scripts/import-legacy-data.mjs
 */
export const importLegacy = internalMutation({
  args: {
    mixes: v.optional(
      v.object({
        folderUrl: v.string(),
        categoryOrder: v.array(v.string()),
        ignoredDriveIds: v.optional(v.array(v.string())),
        ignoredFilenames: v.optional(v.array(v.string())),
        mixes: v.array(
          v.object({
            id: v.string(),
            filename: v.string(),
            title: v.string(),
            driveId: v.union(v.string(), v.null()),
            resourceKey: v.optional(v.union(v.string(), v.null())),
            path: v.string(),
            visible: v.boolean(),
            order: v.number(),
            coverUrl: v.union(v.string(), v.null()),
            category: v.union(v.string(), v.null()),
          }),
        ),
      }),
    ),
    events: v.optional(
      v.array(
        v.object({
          date: v.string(),
          name: v.string(),
          location: v.string(),
          city: v.string(),
          state: v.string(),
        }),
      ),
    ),
    weddings: v.optional(
      v.array(
        v.object({
          slug: v.string(),
          title: v.string(),
          date: v.string(),
          location: v.string(),
          city: v.string(),
          state: v.string(),
          excerpt: v.string(),
          bodyHtml: v.string(),
          coverUrl: v.union(v.string(), v.null()),
          photos: v.array(
            v.object({
              id: v.string(),
              url: v.string(),
              alt: v.string(),
            }),
          ),
          videos: v.array(
            v.object({
              id: v.string(),
              url: v.string(),
              provider: v.union(
                v.literal("youtube"),
                v.literal("vimeo"),
                v.literal("other"),
              ),
            }),
          ),
          published: v.boolean(),
        }),
      ),
    ),
    playCounts: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const summary = {
      mixes: 0,
      events: 0,
      weddings: 0,
      playCounts: 0,
    };

    if (args.mixes) {
      const existingMixes = await ctx.db.query("mixes").collect();
      for (const mix of existingMixes) await ctx.db.delete(mix._id);
      for (const mix of args.mixes.mixes) {
        await ctx.db.insert("mixes", {
          mixKey: mix.id,
          filename: mix.filename,
          title: mix.title,
          driveId: mix.driveId,
          resourceKey: mix.resourceKey ?? null,
          path: mix.path,
          visible: mix.visible,
          order: mix.order,
          coverUrl: mix.coverUrl,
          category: mix.category,
        });
        summary.mixes += 1;
      }
      const settings = await ctx.db
        .query("mixSettings")
        .withIndex("by_singleton", (q) => q.eq("singleton", "default"))
        .unique();
      const payload = {
        singleton: "default" as const,
        folderUrl: args.mixes.folderUrl,
        categoryOrder: args.mixes.categoryOrder,
        ignoredDriveIds: args.mixes.ignoredDriveIds ?? [],
        ignoredFilenames: args.mixes.ignoredFilenames ?? [],
        updatedAt: new Date().toISOString(),
      };
      if (settings) await ctx.db.patch(settings._id, payload);
      else await ctx.db.insert("mixSettings", payload);
    }

    if (args.events) {
      const existing = await ctx.db.query("events").collect();
      for (const event of existing) await ctx.db.delete(event._id);
      for (const event of args.events) {
        await ctx.db.insert("events", event);
        summary.events += 1;
      }
    }

    if (args.weddings) {
      const existing = await ctx.db.query("weddings").collect();
      for (const post of existing) await ctx.db.delete(post._id);
      const updatedAt = new Date().toISOString();
      for (const post of args.weddings) {
        await ctx.db.insert("weddings", { ...post, updatedAt });
        summary.weddings += 1;
      }
    }

    if (args.playCounts) {
      const existing = await ctx.db.query("playCounts").collect();
      for (const row of existing) await ctx.db.delete(row._id);
      for (const [mixKey, count] of Object.entries(args.playCounts)) {
        if (typeof count === "number" && count > 0) {
          await ctx.db.insert("playCounts", { mixKey, count });
          summary.playCounts += 1;
        }
      }
    }

    return summary;
  },
});
