# Changelog

## 0.7.0 - 2026-10-30

- Categories revised from the Keep and WhatsApp analysis: new Family, Health, Life Admin, Home, Career, Personal and Miscellaneous
- Subcategories, one level deep; a parent's card and page include them
- Watch List is now a list; descriptions sharpened for overlapping pairs so JEV can tell them apart; keyword rules moved to match
- `showOnDashboard` (Personal and Miscellaneous are off) and `suggest` (Miscellaneous is manual only) on categories
- Keep label to category mapping for the upcoming importer

## 0.6.0 - 2026-10-29

- Favicon: a calendar with a checkmark
- Sidebar: icons for the Categories and Lists headings; in icons-only mode they stay clickable to fold or unfold
- Fix: a folded section stayed folded when the sidebar collapsed, and saving one `ui` setting no longer resets the others (a settings patch was filling in defaults for keys it left out)
- Dashboard: category cards in a Keep-style masonry grid (no horizontal scroll)
- Sidebar: Categories and Lists sections fold; a toggle shrinks the sidebar to icons only (desktop)
- Both sidebar choices are saved in `settings.json` under `ui`

## 0.5.0 - 2026-10-29

- Dark mode: System, Light or Dark, chosen in Settings or with the sidebar toggle
- Saved in `settings.json` as `ui.theme`; applied before first paint to avoid a light flash
- `ui` settings are merged key by key, so saving one preference never wipes another

## 0.4.0 - 2026-10-29

- Phase 4 backups: every 6 hours (node-cron), `data/` is copied into a new `overplanner-YYYY-MM-DD_HHMMSS` folder in the backup folder (a Google Drive for desktop path)
- Consistent snapshots (taken under the write lock), copied as `.partial` then renamed; old snapshots pruned to a configurable count
- Catch-up backup on startup when the last one is over 6 hours old
- Dashboard shows "Last backed up at …" and Force Backup; Settings has the folder, retention, status and next run

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
