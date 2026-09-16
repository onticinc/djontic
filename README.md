# DJ Ontic

Next.js site for DJ Ontic — featured Google Drive mixes, manually managed events, Eggs Podcast via YouTube, and weddings.

## Setup

1. Copy env values:

```bash
cp .env.example .env
```

2. Fill in:

| Variable | Purpose |
|---|---|
| `GOOGLE_API_KEY` / `YOUTUBE_API_KEY` + `YOUTUBE_EGGS_PLAYLIST_ID` | Eggs Podcast |
| `GOOGLE_DRIVE_API_KEY` + `GOOGLE_DRIVE_FOLDER_ID` | Mixes on Drive (enable Drive API on that key’s project) |
| `ADMIN_PASSWORD` | `/admin/mixes` and `/admin/events` login |

3. Enable [Google Drive API](https://console.developers.google.com/apis/api/drive.googleapis.com/overview) on the same project as your API key.

4. Share the Drive mixes folder as **Anyone with the link** (Viewer).

5. Run:

```bash
npm install
npm run dev
```

6. Open `/admin/mixes` → **Sync Google Drive** → set order/visibility → Save.

7. Open `/admin/events` to add dates, names, locations, cities, and states. After saving, commit `data/events.json`.

## Pages

- `/` — Featured mixes (play, waveform, artwork, download)
- `/events` — Upcoming events
- `/podcast` — Eggs Podcast YouTube playlist
- `/weddings` — Wedding DJ info
- `/admin/mixes` — Manage mix order + visibility
- `/admin/events` — Add and edit event dates, names, locations, cities, and states
