# Overplanner

A personal task and list manager that replaces Google Keep for me. It runs on my PC and is reachable from my phone. Items are classified into categories when added, and search runs locally.

See [SPEC.md](SPEC.md) for the full specification.

## Status

- Phase 1 (skeleton): Vite + React + TypeScript, React Router, Zustand, Tailwind CSS.
- Phase 2 (local API): Express server, JSON storage validated with Zod, item CRUD, Fuse.js search, 30-day purge of deleted items.

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

| Variable | Default | Purpose |
|---|---|---|
| `API_PORT` | `3030` | API (and built app) port |
| `HOST` | `127.0.0.1` | Bind address. Phones reach it through `tailscale serve` |
| `DATA_DIR` | `./data` | Where the JSON files live |

## Data

All data is in `data/`:

- `categories.json` master list (tracked in git as the seed)
- `categories/<slug>.json` items, one file per category or list. An item with several categories is stored once, in the file of its first category
- `inbox.json` items with no category
- `settings.json` thresholds, backup path, UI preferences

Everything except `categories.json` is personal data and is git-ignored. Writes are atomic (temp file, then rename) and every read and write is validated. If a file fails validation, the server refuses to start and names the problem rather than overwriting it.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/categories` | Master list |
| GET | `/api/items` | Open and done items. Query: `q`, `status`, `category`, `source`, `dueFrom`, `dueTo` |
| GET | `/api/items/:id` | One item |
| POST | `/api/items` | Create |
| PATCH | `/api/items/:id` | Update title, notes, categories, kind, status, dueDate, tags |
| DELETE | `/api/items/:id` | Soft delete; purged 30 days later |
| GET, PATCH | `/api/settings` | Settings |

## Layout

- `src/` web app (pages, components, Zustand store, API client)
- `server/` Express API, storage, search, purge job
- `shared/` Zod schemas and types used by both
