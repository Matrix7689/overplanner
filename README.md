# Overplanner

A personal task and list manager that replaces Google Keep for me. It runs on my PC and is reachable from my phone. Items are classified into categories when added, and search runs locally.

See [SPEC.md](SPEC.md) for the full specification.

## Status

- Phase 1 (skeleton): Vite + React + TypeScript, React Router, Zustand, Tailwind CSS.
- Phase 2 (local API): Express server, JSON storage validated with Zod, item CRUD, Fuse.js search, 30-day purge of deleted items.
- Phase 3 (classification): keyword rules, JEV client, suggestion chips in Quick Add and the Inbox, feedback logging.

## Run

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. This starts the API on 127.0.0.1:3030 and the Vite dev server, which forwards `/api` to it.

To run a single server that serves the built app and the API:

```bash
npm run build
npm start
```

Then open http://localhost:3030.

### Environment

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

## Data

All data is in `data/`:

- `categories.json` master list (tracked in git as the seed)
- `categories/<slug>.json` items, one file per category or list. An item with several categories is stored once, in the file of its first category
- `inbox.json` items with no category
- `settings.json` thresholds, backup path, UI preferences
- `feedback.json` classification corrections

Everything except `categories.json` is personal data and is git-ignored. Writes are atomic (temp file, then rename) and every read and write is validated. If a file fails validation, the server refuses to start and names the problem rather than overwriting it.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/categories` | Master list |
| GET | `/api/items` | Open and done items. Query: `q`, `status`, `category`, `source`, `dueFrom`, `dueTo` |
| GET | `/api/items/:id` | One item |
| POST | `/api/items` | Create |
| PATCH | `/api/items/:id` | Update title, notes, categories, kind, status, dueDate, tags, classification |
| DELETE | `/api/items/:id` | Soft delete; purged 30 days later |
| POST | `/api/classify` | `{ text, jev? }` → scores per category. `jev: false` for keyword rules only |
| GET | `/api/classify/status` | JEV configured, last call, number of corrections |
| GET, PATCH | `/api/settings` | Settings |

## Layout

- `src/` web app (pages, components, Zustand store, API client)
- `server/` Express API, storage, search, purge job, classification (`server/classify/`)
- `shared/` Zod schemas and types used by both
