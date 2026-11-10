# Changelog

## 0.21.0 - 2026-11-10

- Theme presets: your current colors are now the "Mocha" preset, joined by Orange, Teal, Deep Ocean and Forest. Pick one to preview it, adjust any of its colors, then Apply

## 0.20.0 - 2026-11-10

- Settings > Theme colors: each color now says what it does in light mode and in dark mode, since most swap jobs between the two

## 0.19.0 - 2026-11-09

- Add categories and lists from Settings > Categories or the sidebar

## 0.18.0 - 2026-11-09

- Pin or unpin a task from its row: a pin button appears on hover, beside Copy and Delete, and stays visible on pinned tasks

## 0.17.0 - 2026-11-09

- Dashboard: a Pinned Tasks toggle that shows only the pinned tasks from each category

## 0.16.0 - 2026-11-09

- Results: removed Streak, and added a linked pie and bar chart of completed tasks per category. Hover to preview a category, click to keep it selected
- Dashboard: a pie chart of open tasks per category beside four cards: Open tasks, Category with highest tasks (replacing Due today), Number of pinned tasks and In the Inbox. Hover a slice to see its count, click to open the category

## 0.15.0 - 2026-11-06

- Copy to clipboard: a button in the item editor, and beside Delete when you hover over a task. It copies the title, details and checklist as plain text; the editor copies what's on screen, including unsaved edits

## 0.14.0 - 2026-11-06

- Phase 6: `npm run import` brings in a Google Keep Takeout and a WhatsApp export using a hand-made classification CSV. It's a dry run unless `--apply` is passed, and it can be re-run without duplicates
- Five big Keep to-do lists split into one task per line; checklists, pins, archive state and original dates are kept, so old completions don't count as recent ones
- A secret scan withholds anything that looks like a password or code, and the report masks what it flagged
- Notes keep single line breaks instead of joining the lines
- New installs start from a standard category set in `defaults/categories.json`; all of `data/` is now git-ignored, so your own categories stay local
- README rewritten around simple install steps, with the technical reference moved to `docs/DETAILS.md`; `SPEC.md` is now a local file
- `npm run import -- --make-csv` writes a starter classification file; the importer also reads iPhone and 12-hour WhatsApp exports. Step-by-step guide in `docs/IMPORTING.md`

## 0.13.0 - 2026-11-05

- Sidebar: Search link below Inbox, and larger Categories and Lists headings
- Backup status and Force Backup moved from the Dashboard to the top bar, on every page. Below large screen widths the text collapses to just the button, which turns amber if the last backup failed

## 0.12.0 - 2026-11-05

- Full visual redesign in a warm coffee palette (`#1A120E`, `#3A2418`, `#6B4A2E`, `#A88462`, `#D5C4AE`, `#4A4A46`), light and dark, with Plus Jakarta Sans
- New UI kit in `src/ui/`: Radix UI components styled with recipes ported from Tailus UI to Tailwind v4 (buttons, checkboxes, selects, sliders, tooltips, dialogs)
- Dark brown sidebar in both themes, glass top bar, and tooltips in the icons-only sidebar
- Dashboard: date and greeting header, tiles for open tasks, due today and Inbox, and a colour wash on each card's header (where background photos can go later)
- The browser's `confirm()` popups are replaced by styled dialogs; the item editor is now a proper modal dialog with focus trapping
- Capture app and icons recoloured to match; its cache version is bumped so installed phones pick up the new look
- Theme colours checked against WCAG AA contrast in both themes: 4.5:1 for text colours, 3:1 for the accent colour used on icons and controls
- Settings > Theme colors: set your own six HEX colours by typing or with a swatch, with live light and dark previews and a warning for hard-to-read combinations; saved in `settings.json` as `ui.customPalette`
- Item editor: pin, mark as done (or archive), delete and close now each have their own coloured background
- Settings > Font: choose from seven fonts, six bundled with the app so they work offline, plus the device's own; saved in `settings.json` as `ui.font`
- Sidebar: Dev and the dark mode toggle removed. The theme is set in Settings > Appearance; the Dev page is still at `/dev` and in the top search
- Settings page has its own section navigation: a column beside the sections on large screens, a row of chips on phones
- Settings > Categories: edit any category (name, description, color, parent, Categories or Lists, keywords, Dashboard and suggestion toggles) or delete it, saved to `data/categories.json`. IDs stay fixed. Deleting never deletes items: they stay in their other categories or move to the Inbox. A category with subcategories can't be deleted until they're moved or deleted

## 0.11.0 - 2026-11-05

- Phase 5: capture app at `/capture/`, installable on Android as a PWA: add tasks and notes to the Inbox, one-way, in about 15KB of code
- Works with the PC off: an offline queue on the phone sends when the PC is reachable, including in the background; safe to retry, and capture times are kept
- Appears in Android's share menu; shared items are saved as notes
- `POST /api/items` accepts an optional `id` and `createdAt` for clients that save offline
- The PC app refreshes its items when the window regains focus and once a minute, so phone captures show up without a reload
- `scripts/install-autostart.ps1` keeps the server running whenever you're signed in to Windows

## 0.10.0 - 2026-11-05

- Search moved from the sidebar to a top navigation bar on every page
- Searches only on Enter or the search button, then shows a dropdown grouped into Categories, Tasks, Notes, Settings and Pages (up to 5 each, with a link to Advanced search for more)
- Keyboard: Ctrl/Cmd+K focuses search, arrow keys and Enter open a result, Esc closes; tasks and notes open in the editor, settings results jump to their section

## 0.9.0 - 2026-11-05

- Dashboard: at most 3 columns, filled left to right; drag cards to reorder (mouse, or long-press on touch), saved in `settings.json` as `ui.dashboardOrder`, with "Reset order"
- Pinned tasks show the pin at the row's right edge so titles stay aligned; category pages group pinned tasks and notes under "Pinned" and "Others"
- Category emojis removed everywhere (`icon` left empty in `categories.json`); categories show their colour instead, and a coloured initial in the icons-only sidebar

## 0.8.0 - 2026-10-30

- Notes: a note is now its own item type with a Markdown body, extracted links and an archive state; tasks keep notes, due dates and open/done
- Checklists and pinning on every item; existing items upgraded in place on load
- Item editor: click any task or note to edit title, details or body (with Markdown preview), due date, checklist, categories, tags, pin, and switch between Task and Note
- Quick Add: Task | Note switch, multi-line input (Shift+Enter); Note is pre-selected for long text, line breaks or links
- Category pages show notes as a card grid (pinned first, archived behind a toggle); Dashboard cards show a notes count; Calendar and Results count tasks only
- Search covers note bodies, links and checklist text, with Type and note status filters

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
