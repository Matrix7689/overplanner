# Changelog

## 0.3.0 - 2026-10-29

- Phase 3 classification: keyword rules (in `categories.json`) run first, then JEV (TypeSafe AI) scores every category in one call
- Suggestion chips in Quick Add and the Inbox: pre-selected at 0.80, "Maybe" from 0.40, user toggles kept; nothing selected goes to the Inbox
- Saving never waits on JEV; failures and timeouts fall back to keyword rules
- Corrections logged to `data/feedback.json` and fed back to JEV as examples
- Settings shows JEV status, last call and a test box; JEV key read from `.env`

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
