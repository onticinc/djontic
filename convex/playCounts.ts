import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("playCounts").collect();
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.mixKey] = row.count;
    }
    return counts;
  },
});

export const getOne = query({
  args: { mixKey: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("playCounts")
      .withIndex("by_mixKey", (q) => q.eq("mixKey", args.mixKey))
      .unique();
    return row?.count ?? 0;
  },
});

export const increment = mutation({
  args: { mixKey: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("playCounts")
      .withIndex("by_mixKey", (q) => q.eq("mixKey", args.mixKey))
      .unique();
    if (row) {
      const next = row.count + 1;
      await ctx.db.patch(row._id, { count: next });
      return next;
    }
    await ctx.db.insert("playCounts", { mixKey: args.mixKey, count: 1 });
    return 1;
  },
});

export const replaceAll = mutation({
  args: { counts: v.record(v.string(), v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("playCounts").collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }
    for (const [mixKey, count] of Object.entries(args.counts)) {
      if (typeof count === "number" && count > 0) {
        await ctx.db.insert("playCounts", { mixKey, count });
      }
    }
  },
});
