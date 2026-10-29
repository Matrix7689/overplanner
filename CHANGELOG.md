# Changelog

## 0.2.0 - 2026-10-29

- Phase 2 local API: Express server with JSON storage in `data/` (one file per category, plus inbox and settings)
- Atomic writes and Zod validation on every read and write
- Item CRUD, settings API, Fuse.js search with category, status, source and due-date filters
- Deleted items purged 30 days after deletion (on startup and daily)
- Web app now loads and saves through the API; mock data removed; new Search page

## 0.1.0 - 2026-10-29

- Phase 1 skeleton: Vite, React, TypeScript, Tailwind, React Router, Zustand
- Pages: Dashboard, Category, Calendar, Results, Inbox, Dev, Settings
- Responsive sidebar, mock data, seed `data/categories.json`
