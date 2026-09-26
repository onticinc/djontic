# DJ Ontic

Next.js site for DJ Ontic — featured Google Drive mixes, events, wedding recaps, and Eggs Podcast via YouTube. CMS data and admin auth live in [Convex](https://convex.dev) with Convex Auth (password).

## Setup

1. Copy env values:

```bash
cp .env.example .env.local
```

2. Fill in:

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` / `YOUTUBE_API_KEY` + `YOUTUBE_EGGS_PLAYLIST_ID` | Eggs Podcast |
| `GOOGLE_DRIVE_API_KEY` + `GOOGLE_DRIVE_FOLDER_ID` | Mixes on Drive (enable Drive API on that key’s project) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (from `npx convex dev`) |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_IMAGES_API_TOKEN` + `CLOUDFLARE_IMAGES_DELIVERY_URL` | Wedding photo uploads |

3. Enable [Google Drive API](https://console.developers.google.com/apis/api/drive.googleapis.com/overview) on the same project as your API key.

4. Share the Drive mixes folder as **Anyone with the link** (Viewer).

5. Start Convex (creates/links a deployment and writes `NEXT_PUBLIC_CONVEX_URL`):

```bash
npx convex dev
```

Convex Auth needs `JWT_PRIVATE_KEY` and `JWKS` on the deployment (set once via `npx @convex-dev/auth` or the dashboard).

6. In another terminal:

```bash
npm install
npm run dev
```

7. Open `/admin`, use **Create first admin account** once (email + password), then manage mixes, events, and wedding recaps.

8. One-time import of existing `data/*.json` into Convex (optional, if migrating from the old filesystem store):

```bash
node scripts/import-legacy-data.mjs
```

After a successful import, `data/*.json` is only a backup — the live site reads and writes Convex. Do not commit runtime changes to those JSON files.

## Pages

- `/` — Featured mixes (play, waveform, artwork, download)
- `/events` — Upcoming events
- `/podcast` — Eggs Podcast YouTube playlist
- `/weddings` — Wedding info + published recaps
- `/weddings/[slug]` — Wedding recap detail
- `/admin` — Admin hub (Convex Auth)
- `/admin/mixes` — Manage mix order + visibility
- `/admin/events` — Event dates, names, locations, cities, and states
- `/admin/weddings` — Wedding recaps (rich text, photos, videos)
