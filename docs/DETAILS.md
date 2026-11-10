# Technical details

How Overplanner works, for anyone changing it or setting it up in detail. To install it, start with the [README](../README.md).

## Phone capture

`/capture/` is a small separate app for the phone: a text box, a Task/Note switch and a list of what's waiting. It only ever sends items to the PC's Inbox (uncategorized, to be filed from the PC) and never downloads anything, so none of your other data is on the phone.

It keeps working with the PC off. Items wait in a queue on the phone and are sent when the PC can be reached: when the app opens, every 30 seconds while it's open, with "Send now", and in the background on Android. Each item carries its own id, so a repeated send can't create a duplicate, and its capture time is kept.

Setting it up (phone and PC need the same Tailscale account):

1. Install [Tailscale](https://tailscale.com/download) on the PC and the phone, and sign in on both.
2. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), turn on MagicDNS and HTTPS Certificates.
3. Start the server ([README](../README.md#install)), then share it on your tailnet only. This is not exposed to the internet:

   ```bash
   tailscale serve --bg 3030
   ```

4. On the phone, open `https://<pc-name>.<tailnet>.ts.net/capture/` in Chrome and choose **Add to Home screen** (or **Install app**).

"Capture" then appears on the home screen and in Android's share menu. Shared items are saved as notes. The full app is at the same address without `/capture/`.

## Environment

Settings come from environment variables or a `.env` file in the project root (git-ignored; copy `.env.example`). Real environment variables win over `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `JEV_API_KEY` | none | TypeSafe AI key. Without it, suggestions use keyword rules only |
| `JEV_MODEL` | `jev-latest` | JEV model or alias |
| `JEV_BASE_URL` | `https://api.typesafe.ai/v1` | JEV API base URL |
| `JEV_TIMEOUT_MS` | `8000` | After this, the keyword guess is used |
| `API_PORT` | `3030` | API (and built app) port |
| `HOST` | `127.0.0.1` | Bind address. Phones reach it through `tailscale serve` |
| `DATA_DIR` | `./data` | Where the JSON files live |

## Classification

1. Keyword rules run first. Each category's `keywords` in `categories.json` are matched as whole words (plurals too); entries with punctuation such as `youtube.com` or `$` match anywhere. One hit scores 0.85, two or more 0.95.
2. JEV (`POST /v1/systemone`) gets one `score` question per category, built from its name and description plus a few of your past corrections. The 0–2 rubric result is scaled to 0–1. The final score per category is the higher of the keyword and JEV scores.
3. Chips: at or above the auto-select threshold (0.80) they start selected; from the "Maybe" threshold (0.40) they show unselected. Both are adjustable in Settings. With nothing selected, the item goes to the Inbox.
4. Saving never waits on JEV. If it fails or times out, the keyword guess is used.
5. Whenever you save categories that differ from the pre-selected ones, or change an item's categories later, the example goes to `data/feedback.json`.

Quick Add on the Dashboard and Inbox asks JEV after a short pause in typing. In the Inbox, items get keyword suggestions at once and "Ask JEV" on demand.

## Backup

Set the backup folder in Settings, for example `G:\My Drive\Overplanner backups` (a Google Drive for desktop folder, so it syncs to the cloud).

- Every 6 hours (00:00, 06:00, 12:00, 18:00) the whole `data/` folder is copied into a new folder named `overplanner-YYYY-MM-DD_HHMMSS`. If the PC was off at those times, a backup runs when the server starts.
- The copy is taken while writes are paused, so it's consistent. It's written as `….partial` and renamed when complete.
- The newest 28 snapshots are kept (adjustable). Pruning only removes `overplanner-…` folders; anything else in the folder is left alone.
- If the folder's parent is missing (Google Drive not running), the backup fails with a message and the top bar shows "Last backup failed".
- To restore, stop the server and copy a snapshot's contents back into `data/`.

## Import

Bring in your Google Keep notes and WhatsApp chats with `npm run import`. [IMPORTING.md](IMPORTING.md) covers exporting the data and running the import, step by step.

## Data

All data is in `data/`:

- `categories.json` your categories and lists. Created on first run from [defaults/categories.json](../defaults/categories.json), then yours to change in Settings
- `categories/<slug>.json` items, one file per category or list. An item with several categories is stored once, in the file of its first category
- `inbox.json` items with no category
- `settings.json` thresholds, backup path, UI preferences (`ui.theme`: `system`, `light` or `dark`; `ui.font`; `ui.customPalette`: six HEX colors, or `null` for the Mocha preset (the default; the others are in `src/lib/palette.ts`); `ui.sidebarCollapsed`; `ui.collapsedSections`; `ui.dashboardOrder`)
- `feedback.json` classification corrections
- `backup.json` outcome of the last backups

All of `data/` is personal and git-ignored, so your categories and items never reach the repository. Writes are atomic (temp file, then rename) and every read and write is validated. If a file fails validation, the server refuses to start and names the problem rather than overwriting it.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/categories` | Master list |
| POST | `/api/categories` | Add a category or list; the ID comes from its name |
| GET | `/api/items` | Tasks and notes (never deleted ones). Query: `q`, `kind` (`task`/`note`), `status` (`open`/`done`/`active`/`archived`), `category`, `source`, `dueFrom`, `dueTo` |
| GET | `/api/items/:id` | One item |
| POST | `/api/items` | Create a task (`kind` `task`/`list-item`, default) or a note (`kind: "note"`, `body`) |
| PATCH | `/api/items/:id` | Update any fields; changing `kind` converts between task and note and keeps the id |
| DELETE | `/api/items/:id` | Soft delete; purged 30 days later |
| POST | `/api/classify` | `{ text, jev? }` → scores per category. `jev: false` for keyword rules only |
| GET | `/api/classify/status` | JEV configured, last call, number of corrections |
| GET | `/api/backup` | Backup status: last success, last error, next run |
| POST | `/api/backup` | Force Backup; returns the status when done |
| GET, PATCH | `/api/settings` | Settings |

## Layout

- `src/` web app (pages, components, Zustand store, API client)
- `server/` Express API, storage, search, purge job, classification (`server/classify/`)
- `shared/` Zod schemas and types used by both
- `defaults/` the categories a new install starts with
- `scripts/` importer and Windows autostart
- `docs/` guides
