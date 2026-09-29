#!/usr/bin/env node
/**
 * Scrape wedding recaps from the legacy WordPress site, download photos
 * into public/weddings/, write data/weddings.json, and import into Convex.
 *
 * Usage: node scripts/import-legacy-weddings.mjs
 */
import { spawnSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = join(root, "public", "weddings");
const sizeSuffix = /-\d+x\d+(?=\.(jpe?g|png|webp|gif)$)/i;

const POSTS = [
  {
    url: "https://www.djontic.com/wedding/",
    slug: "2023-wedding-season-june-july",
    title: "2023 Wedding Season June & July",
    date: "2023-07-23",
    location: "",
    city: "Chelan",
    state: "WA",
    excerpt: "Highlights from the 2023 wedding season — June and July.",
    bodyHtml:
      "<p>A look back at the 2023 wedding season across June and July.</p>",
    knownVideos: [
      { url: "https://www.youtube.com/watch?v=13WTsfu31_c", provider: "youtube" },
    ],
    coverUrl: "https://img.youtube.com/vi/13WTsfu31_c/hqdefault.jpg",
  },
  {
    url: "https://www.djontic.com/sam-david-wedding/",
    slug: "sam-david-wedding",
    title: "Sam + David Wedding",
    date: "2023-01-17",
    location: "WithinSodo",
    city: "Seattle",
    state: "WA",
    excerpt: "Photos by juliakinnunenphotography.com at WithinSodo.",
    bodyHtml:
      "<p>Photos by <a href=\"https://juliakinnunenphotography.com\" target=\"_blank\" rel=\"noopener noreferrer\">Julia Kinnunen Photography</a>.</p><p>Venue: WithinSodo.</p>",
    photographerName: "Julia Kinnunen Photography",
    photographerUrl: "https://juliakinnunenphotography.com",
  },
  {
    url: "https://www.djontic.com/helle-russell-wedding/",
    slug: "helle-russell-wedding",
    title: "Helle & Russell Wedding",
    date: "2023-01-16",
    location: "Larc Hill Vineyard",
    city: "",
    state: "WA",
    excerpt: "Photos by Nicole Connor. Planner: True Expressions Wedding Planner.",
    bodyHtml:
      "<p>Photos by Nicole Connor.</p><p>Venue: Larc Hill Vineyard.</p><p>Planner: True Expressions Wedding Planner.</p>",
    photographerName: "Nicole Connor",
    photographerUrl: null,
  },
  {
    url: "https://www.djontic.com/siren-songs-winery/",
    slug: "siren-songs-winery",
    title: "Siren Songs Winery",
    date: "2023-01-16",
    location: "Siren Songs Winery",
    city: "Chelan",
    state: "WA",
    excerpt: "Photos by Kamio Lavarria. Dinner music by Scott Foster.",
    bodyHtml:
      "<p>Photos by Kamio Lavarria.</p><p>Venue: Siren Songs Winery, Chelan.</p><p>Dinner music: Scott Foster.</p>",
    photographerName: "Kamio Lavarria",
    photographerUrl: null,
  },
  {
    url: "https://www.djontic.com/miscellaneous-wedding-pics/",
    slug: "tsillan-cellars",
    title: "Tsillan Cellars",
    date: "2021-07-20",
    location: "Tsillan Cellars",
    city: "Chelan",
    state: "WA",
    excerpt: "Wedding photos from Tsillan Cellars in Chelan.",
    bodyHtml: "<p>Venue: Tsillan Cellars, Chelan, Washington.</p>",
  },
  {
    url: "https://www.djontic.com/jessica-and-david-wedding/",
    slug: "jessica-and-david-wedding",
    title: "Jessica and David Wedding",
    date: "2021-07-20",
    location: "Tsillan Cellars",
    city: "Chelan",
    state: "WA",
    excerpt: "Video by Grace Media Films at Tsillan Cellars.",
    bodyHtml:
      "<p>Venue: Tsillan Cellars, Chelan.</p><p>Video by Grace Media Films.</p>",
    knownVideos: [
      { url: "https://vimeo.com/314523578", provider: "vimeo" },
    ],
  },
];

function canonicalImage(url) {
  return url.replace(/&amp;/g, "&").replace(sizeSuffix, "");
}

function isNoiseImage(url) {
  return /avatar|logo|icon|sprite|emoji|scott_foster|ontic_logo|cropped-ontic|Screen-Shot-2020-11-22/i.test(
    url,
  );
}

function extractImages(html) {
  const urls = [];
  const patterns = [
    /(?:src|data-src|data-lazy-src|data-full-url|data-large_image)="(https:\/\/www\.djontic\.com\/wp-content\/uploads\/[^"]+\.(?:jpe?g|png|webp|gif))"/gi,
    /property="og:image"\s+content="(https:\/\/www\.djontic\.com\/wp-content\/uploads\/[^"]+)"/gi,
    /(https:\/\/www\.djontic\.com\/wp-content\/uploads\/[^"' \s>]+\.(?:jpe?g|png|webp|gif))/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      urls.push(canonicalImage(match[1]));
    }
  }
  return [...new Set(urls)].filter((url) => !isNoiseImage(url));
}

function extractVideos(html, known = []) {
  const found = [
    ...[...html.matchAll(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/g)].map(
      (m) => ({
        url: `https://www.youtube.com/watch?v=${m[1]}`,
        provider: "youtube",
      }),
    ),
    ...[...html.matchAll(/youtu\.be\/([A-Za-z0-9_-]+)/g)].map((m) => ({
      url: `https://www.youtube.com/watch?v=${m[1]}`,
      provider: "youtube",
    })),
    ...[...html.matchAll(/player\.vimeo\.com\/video\/(\d+)/g)].map((m) => ({
      url: `https://vimeo.com/${m[1]}`,
      provider: "vimeo",
    })),
    ...known,
  ];
  const seen = new Set();
  return found.filter((video) => {
    if (seen.has(video.url)) return false;
    seen.add(video.url);
    return true;
  });
}

async function downloadImage(url, destPath) {
  if (existsSync(destPath)) return true;
  const response = await fetch(url, {
    headers: { "User-Agent": "djontic-wedding-import/1.0" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    console.warn(`  skip ${url} (${response.status})`);
    return false;
  }
  mkdirSync(dirname(destPath), { recursive: true });
  await pipeline(response.body, createWriteStream(destPath));
  return true;
}

function localFilename(url, index) {
  const base = decodeURIComponent(url.split("/").pop() || `photo-${index}`);
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const ext = extname(safe) || ".jpg";
  const stem = safe.slice(0, -ext.length) || `photo-${index}`;
  return `${stem}${ext.toLowerCase()}`;
}

async function scrapePost(meta) {
  console.log(`Fetching ${meta.slug}…`);
  const response = await fetch(meta.url, {
    headers: { "User-Agent": "djontic-wedding-import/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${meta.url}: ${response.status}`);
  }
  const html = await response.text();
  const imageUrls = extractImages(html);
  const videos = extractVideos(html, meta.knownVideos).map((video) => ({
    id: randomUUID(),
    url: video.url,
    provider: video.provider,
  }));

  const dir = join(publicRoot, meta.slug);
  mkdirSync(dir, { recursive: true });

  const photos = [];
  for (const [index, url] of imageUrls.entries()) {
    const filename = localFilename(url, index + 1);
    const dest = join(dir, filename);
    const ok = await downloadImage(url, dest);
    if (!ok) continue;
    photos.push({
      id: randomUUID(),
      url: `/weddings/${meta.slug}/${filename}`,
      alt: `${meta.title} photo ${photos.length + 1}`,
    });
  }

  const coverUrl =
    meta.coverUrl ?? photos[0]?.url ?? null;

  return {
    slug: meta.slug,
    title: meta.title,
    date: meta.date,
    location: meta.location,
    city: meta.city,
    state: meta.state,
    excerpt: meta.excerpt,
    bodyHtml: meta.bodyHtml,
    coverUrl,
    photographerName: meta.photographerName ?? "",
    photographerUrl: meta.photographerUrl ?? null,
    photos,
    videos,
    published: true,
  };
}

const posts = [];
for (const meta of POSTS) {
  const post = await scrapePost(meta);
  console.log(
    `  ${post.title}: ${post.photos.length} photos, ${post.videos.length} videos`,
  );
  posts.push(post);
}

const store = {
  updatedAt: new Date().toISOString(),
  posts,
};

writeFileSync(
  join(root, "data", "weddings.json"),
  `${JSON.stringify(store, null, 2)}\n`,
);
console.log(`Wrote data/weddings.json (${posts.length} posts)`);

const importArgs = {
  weddings: posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    location: post.location,
    city: post.city,
    state: post.state,
    excerpt: post.excerpt,
    bodyHtml: post.bodyHtml,
    coverUrl: post.coverUrl,
    photographerName: post.photographerName || "",
    photographerUrl: post.photographerUrl ?? null,
    photos: post.photos,
    videos: post.videos,
    published: post.published,
  })),
};

const result = spawnSync(
  "npx",
  ["convex", "run", "seed:importLegacy", JSON.stringify(importArgs)],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error("Convex import failed.");
  process.exit(result.status || 1);
}

console.log("Wedding recaps imported into Convex.");
