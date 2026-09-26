import { api } from "@convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";

export async function getPlayCounts(): Promise<Record<string, number>> {
  return await fetchQuery(api.playCounts.getAll, {});
}

export async function getPlayCount(mixId: string): Promise<number> {
  return await fetchQuery(api.playCounts.getOne, { mixKey: mixId });
}

export async function incrementPlayCount(mixId: string): Promise<number> {
  return await fetchMutation(api.playCounts.increment, { mixKey: mixId });
}
