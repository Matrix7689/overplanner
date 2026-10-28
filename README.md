# Overplanner

A personal task and list manager that replaces Google Keep for me. It runs on my PC and is reachable from my phone. Items are classified into categories when added, and search runs locally.

See [SPEC.md](SPEC.md) for the full specification.

## Status

Phase 1 (skeleton): Vite + React + TypeScript, React Router, Zustand, Tailwind CSS, mock data.
Changes live in memory only and reset on reload until the local API lands in phase 2.

## Run

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Layout

- `src/` web app (pages, components, Zustand store, mock data)
- `shared/` types shared with the server (phase 2)
- `data/categories.json` master category list, used as seed data
