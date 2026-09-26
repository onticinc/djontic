#!/usr/bin/env node
/**
 * One-time import of data/*.json into Convex.
 * Usage: node scripts/import-legacy-data.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(name) {
  return JSON.parse(readFileSync(join(root, "data", name), "utf8"));
}

const mixesFile = readJson("mixes.json");
const eventsFile = readJson("events.json");
const weddingsFile = readJson("weddings.json");
const playCountsFile = readJson("play-counts.json");

const args = {
  mixes: {
    folderUrl: mixesFile.folderUrl || "",
    categoryOrder: mixesFile.categoryOrder || [],
    ignoredDriveIds: mixesFile.ignoredDriveIds || [],
    ignoredFilenames: mixesFile.ignoredFilenames || [],
    mixes: (mixesFile.mixes || []).map((mix) => ({
      id: mix.id,
      filename: mix.filename,
      title: mix.title,
      driveId: mix.driveId ?? null,
      path: mix.path || `/${mix.filename}`,
      visible: Boolean(mix.visible),
      order: typeof mix.order === "number" ? mix.order : 0,
      coverUrl: mix.coverUrl ?? null,
      category: mix.category ?? null,
    })),
  },
  events: (eventsFile.events || []).map((event) => ({
    date: event.date,
    name: event.name,
    location: event.location,
    city: event.city || "",
    state: event.state || "",
  })),
  weddings: (weddingsFile.posts || []).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    location: post.location || "",
    city: post.city || "",
    state: post.state || "",
    excerpt: post.excerpt || "",
    bodyHtml: post.bodyHtml || "",
    coverUrl: post.coverUrl ?? null,
    photos: post.photos || [],
    videos: post.videos || [],
    published: Boolean(post.published),
  })),
  playCounts: playCountsFile.counts || {},
};

const result = spawnSync(
  "npx",
  ["convex", "run", "seed:importLegacy", JSON.stringify(args)],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error("Import failed.");
  process.exit(result.status || 1);
}

console.log("Legacy JSON imported into Convex.");
