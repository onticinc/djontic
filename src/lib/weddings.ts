import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import {
  ensureUniqueSlugs,
  formatWeddingDate,
  normalizeWeddingPost,
  sortWeddingPosts,
  type PublicWeddingPost,
  type WeddingPost,
  type WeddingsStore,
} from "./wedding-types";

export type { PublicWeddingPost, WeddingPost, WeddingsStore };
export {
  formatWeddingDate,
  normalizeWeddingPost,
  sortWeddingPosts,
  ensureUniqueSlugs,
};

export async function getPublishedWeddingPosts(): Promise<PublicWeddingPost[]> {
  return await fetchQuery(api.weddings.listPublished, {});
}

export async function getWeddingPageSettings() {
  return await fetchQuery(api.weddings.getPageSettings, {});
}

export async function getWeddingPostBySlug(
  slug: string,
): Promise<PublicWeddingPost | null> {
  return await fetchQuery(api.weddings.getBySlug, { slug });
}
