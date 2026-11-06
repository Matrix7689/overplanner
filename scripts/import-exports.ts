// Imports a Google Keep Takeout and a WhatsApp chat export, using a classification
// CSV that holds a category and Task or Note choice for every note and message.
// docs/IMPORTING.md is the full guide.
//
//   npm run import -- --dir <exports> --make-csv   writes a starter CSV to fill in
//   npm run import -- --dir <exports>              dry run: report only
//   npm run import -- --dir <exports> --apply      writes items (server stopped)
//
// Safe to re-run: ids come from the source, so items already imported are skipped.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CategoryRepo } from "../server/categories";
import { keywordScores } from "../server/classify/keywords";
import { config } from "../server/config";
import { ItemRepo } from "../server/items";
import { extractLinks } from "../server/itemModel";
import { SettingsRepo } from "../server/settings";
import type { CategoryDef, ChecklistEntry, Item } from "../shared/types";

type Row = Record<string, string>;

// Personal decisions, kept beside the exports rather than in the repo.
type Overrides = {
  categoryMap?: Record<string, string>; // the CSV's labels -> a category, or split, secret, skip
  chatId?: string; // fixes this chat's id prefix; normally it comes from the folder name

  allow?: string[]; // refs the secret scan flagged wrongly
  block?: string[]; // refs to leave out regardless
  titles?: Record<string, string>; // titles for photo-only messages
  texts?: Record<string, string>; // what a photo says, so its note can be searched
  categories?: Record<string, string[]>; // refs or list lines ("file#3") to file somewhere specific
};

const CSV_FILE = "overplanner_classification.csv";
const CSV_TITLE = "title / text";
const CSV_KIND = "kind (T=task,N=note)";
const sha = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length > 0) rows.push([...row, cell]);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^\uFEFF/, ""), r[i] ?? ""])));
}

// ---- Secret scan ----

const URLS = /https?:\/\/\S+/g;
const SECRET_WORDS =
  /\b(pass ?words?|passwd|pwd|pass ?codes?|pins?|otp|recovery codes?|backup codes?|security codes?|gate codes?|door codes?|access codes?|ssn|social security|cvv|routing|account (?:no|number|num)|alien number|receipt number|application (?:id|no|number)|passport (?:no|number)|api keys?|secret|login|username|user ?id)\b/i;
const SECRET_TOKENS: [string, RegExp][] = [
  ["letters, digits and a symbol", /(?=\S*[A-Za-z])(?=\S*\d)\S*[!@#$%^&*]\S*/],
  ["word with a symbol inside", /\b[A-Za-z]{3,}[!@#$%^&*][A-Za-z0-9]+\b/],
  ["@ with no domain", /\b[\w.+-]+@(?![\w-]+\.[A-Za-z]{2,})[\w-]+\b/],
  ["long digit run", /\b\d{6,}\b/],
  ["grouped digits", /\b\d{2,4}[- ]\d{2,4}[- ]\d{2,4}\b/],
  ["letter then digits", /\b[A-Za-z]{1,3}\d{5,}\b/],
];

function secretReason(text: string): string | null {
  const plain = text.replace(URLS, " ");
  const word = plain.match(SECRET_WORDS);
  if (word) return `mentions "${word[1].toLowerCase()}"`;
  for (const [reason, pattern] of SECRET_TOKENS) if (pattern.test(plain)) return reason;
  return null;
}

// Keeps plain words readable so a flag can be judged, and hides the rest: the
// shape of a token with digits or symbols, and everything after a secret word.
function mask(text: string): string {
  const shape = (s: string) => s.replace(/[A-Za-z]/g, "x").replace(/\d/g, "#");
  return text
    .replace(URLS, "<link>")
    .split("\n")
    .map((line) => {
      const word = line.match(SECRET_WORDS);
      const cut = word ? (word.index ?? 0) + word[0].length : line.length;
      const before = line.slice(0, cut).replace(/\S*[\d!@#$%^&*]\S*/g, shape);
      return before + shape(line.slice(cut));
    })
    .join(" / ");
}

// ---- Sources ----

type Message = { createdAt: string; text: string };

// A message line, in Android's and the iPhone's formats, 12- or 24-hour:
//   2/25/21, 21:13 - Name: text
//   2/25/21, 9:13 PM - Name: text
//   [25/02/21, 21:13:05] Name: text
const LINE = /^[\u200e\u200f]?\[?(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),? (\d{1,2}):(\d{2})(?::\d{2})?(?:[\s\u202f]?([ap])\.?m\.?)?\]?(?: -)? ([\s\S]*)$/i;

// Which number comes first varies by phone. A value over 12 settles it.
function detectDayFirst(lines: string[], order?: string): boolean {
  if (order === "dmy" || order === "mdy") return order === "dmy";
  for (const line of lines) {
    const m = line.match(LINE);
    if (m && Number(m[1]) > 12) return true;
    if (m && Number(m[2]) > 12) return false;
  }
  return false;
}

function readChat(file: string, order?: string): Message[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const dayFirst = detectDayFirst(lines, order);
  const messages: Message[] = [];
  let current: Message | null = null;
  for (const line of lines) {
    const m = line.match(LINE);
    if (!m) {
      if (current) current.text += `\n${line}`;
      continue;
    }
    const [a, b, year, hour, minute] = m.slice(1, 6).map(Number);
    const sent = m[7].match(/^([^:]+): ([\s\S]*)$/);
    // A system line, such as someone leaving the group: no "Name:" on Android,
    // and on the iPhone a hidden mark before the text (which media lines share).
    if (!sent || /^\u200e(?!<attached:|(?:image|video|audio|document|sticker|GIF|Contact card|Location) omitted)/i.test(sent[2])) {
      current = null;
      continue;
    }
    const meridiem = m[6]?.toLowerCase();
    const hours = meridiem ? (hour % 12) + (meridiem === "p" ? 12 : 0) : hour;
    const when = new Date(year < 100 ? 2000 + year : year, (dayFirst ? b : a) - 1, dayFirst ? a : b, hours, minute);
    current = { createdAt: when.toISOString(), text: sent[2].replace(/[\u200e\u200f]/g, "") };
    messages.push(current);
  }
  return messages;
}

const PHOTO_FILE = /^(\S+\.(?:jpe?g|png|webp|heic)) \(file attached\)|^<attached: ([^>]+\.(?:jpe?g|png|webp|heic))>/gim;
const OTHER_MEDIA = /^<Media omitted>|^<attached: [^>]+>|^(?:image|video|audio|document|sticker|GIF) omitted$/gim;
const DELETED = /^(?:This message was deleted\.?|You deleted this message\.?)$/i;

function findChat(dir: string): string | null {
  const folder = readdirSync(dir).find((n) => n.startsWith("WhatsApp Chat") && statSync(path.join(dir, n)).isDirectory());
  if (!folder) return null;
  const text = readdirSync(path.join(dir, folder)).find((n) => n.toLowerCase().endsWith(".txt"));
  return text ? path.join(dir, folder, text) : null;
}

function findKeep(dir: string): string | null {
  return ["Keep JSON", "Keep", "Takeout/Keep"].map((n) => path.join(dir, n)).find((p) => existsSync(p)) ?? null;
}

const keepFiles = (keepDir: string) => readdirSync(keepDir).filter((n) => n.toLowerCase().endsWith(".json"));

// A starter CSV with one row per note and message and the category left blank.
function makeCsv(dir: string, order?: string): void {
  const file = path.join(dir, CSV_FILE);
  if (existsSync(file)) throw new Error(`${file} already exists, and has been left alone. Move it first to start over.`);
  const cell = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const preview = (s: string) => s.trim().split("\n")[0].trim().slice(0, 90);
  const rows: string[][] = [];

  const keepDir = findKeep(dir);
  if (keepDir) {
    for (const name of keepFiles(keepDir)) {
      const note = JSON.parse(readFileSync(path.join(keepDir, name), "utf8"));
      const empty = !note.title?.trim() && !note.textContent?.trim() && !note.listContent?.length;
      const category = note.isTrashed ? "skip: In the Keep trash" : empty ? "skip: No text" : "";
      rows.push(["keep", name, preview(note.title?.trim() ? note.title : (note.textContent ?? "(checklist)")), category, "", note.listContent?.length ? "T" : "N"]);
    }
  }
  const chat = findChat(dir);
  if (chat) {
    readChat(chat, order).forEach((m, i) => {
      const text = m.text.replace(PHOTO_FILE, "").replace(OTHER_MEDIA, "").trim();
      const hasPhoto = /\(file attached\)|<attached:/i.test(m.text);
      const category = !text && !hasPhoto ? "skip: Empty message" : DELETED.test(text) ? "skip: Deleted message" : "";
      const task = /^(buy|get|watch|read|learn|call|email|book|try|fix|figure out|find|pay|send|clean|order|make|plan|check)\b/i.test(text);
      rows.push(["whatsapp", `msg ${i}`, preview(text || m.text), category, "", task ? "T" : "N"]);
    });
  }
  if (rows.length === 0) throw new Error(`No "Keep JSON" folder or "WhatsApp Chat ..." folder found in ${dir}`);

  const lines = [["source", "ref", CSV_TITLE, "category", "secondary", CSV_KIND], ...rows].map((r) => r.map(cell).join(","));
  writeFileSync(file, `${lines.join("\n")}\n`);
  console.log(`Wrote ${file} with ${rows.length} rows. Fill in the category column, then run a dry run.`);
}

function messageRefs(ref: string): number[] {
  return ref
    .replace(/^msg /, "")
    .split(",")
    .flatMap((part) => {
      const [a, b] = part.split("-").map(Number);
      return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
    });
}

const usecToIso = (usec: number) => new Date(usec / 1000).toISOString();

// A first line for the title, the rest as text. Long first lines stay whole in
// the text, and a bare link is never a title.
function splitTitle(text: string, maxTitle: number): { title: string; rest: string } {
  const trimmed = text.trim();
  const newline = trimmed.indexOf("\n");
  const first = (newline === -1 ? trimmed : trimmed.slice(0, newline)).trim();
  if (first.length > maxTitle || /^https?:\/\/\S+$/.test(first)) return { title: "", rest: trimmed };
  return { title: first, rest: newline === -1 ? "" : trimmed.slice(newline + 1).trim() };
}

function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const dirArg = value("--dir");
  if (!dirArg) throw new Error('Usage: npm run import -- --dir "<exports folder>" [--make-csv | --apply] [--date-order dmy|mdy]');
  const order = value("--date-order");
  if (args.includes("--make-csv")) {
    makeCsv(path.resolve(dirArg), order);
    return Promise.resolve();
  }
  return run(path.resolve(dirArg), args.includes("--apply"), order);
}

async function run(dir: string, apply: boolean, order?: string) {
  if (apply) {
    const live = await fetch(`http://${config.host}:${config.port}/api/health`).then(
      () => true,
      () => false,
    );
    if (live) throw new Error(`The server is running on port ${config.port}, and would overwrite this import. Stop it first.`);
  }

  const categories = new CategoryRepo(config.dataDir, config.seedCategoriesFile);
  await categories.load();
  const items = new ItemRepo(config.dataDir, categories);
  await items.load();
  const settings = new SettingsRepo(config.dataDir);
  await settings.load();
  const threshold = settings.get().autoSelectThreshold;

  const overridesFile = path.join(dir, "import-overrides.json");
  const overrides: Overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : {};
  const allow = new Set(overrides.allow ?? []);
  const block = new Set(overrides.block ?? []);

  const csvFile = path.join(dir, CSV_FILE);
  if (!existsSync(csvFile)) throw new Error(`${csvFile} not found. Create one with --make-csv.`);
  const rows = parseCsv(readFileSync(csvFile, "utf8"));
  const keepDir = findKeep(dir);
  const chat = findChat(dir);
  const messages = chat ? readChat(chat, order) : [];
  // Message numbers only mean something within a chat, so each chat's ids get
  // their own prefix. Otherwise a second chat would look already imported.
  const chatId = overrides.chatId ?? (chat ? sha(path.basename(path.dirname(chat))) : "");
  const chatPrefix = chatId ? `wa-${chatId}-` : "wa-";

  const bySlug = new Map(categories.all().map((c) => [c.slug, c]));
  // The CSV's category column holds a category's name or slug, or a label that
  // categoryMap in import-overrides.json turns into one.
  const slugFor = (name: string) => {
    const wanted = (overrides.categoryMap?.[name] ?? name).trim().toLowerCase();
    const match = categories.all().find((c) => c.slug === wanted || c.name.toLowerCase() === wanted);
    if (!match) throw new Error(`The CSV's "${name}" isn't a category. Use a name from Settings > Categories, or add it to categoryMap in import-overrides.json.`);
    return match.slug;
  };

  // A subcategory, when its keywords match: "Travel" stays Travel unless the
  // text points at one of its subcategories.
  const refine = (slug: string, text: string): string => {
    const children: CategoryDef[] = categories.children(slug);
    if (children.length === 0) return slug;
    const scores = keywordScores(text, children);
    return children.find((c) => (scores[c.slug] ?? 0) >= threshold)?.slug ?? slug;
  };

  const out: Item[] = [];
  const skipped: { ref: string; reason: string; text: string }[] = [];
  const flagged: { ref: string; reason: string; text: string; allowed: boolean }[] = [];
  const photos: { ref: string; files: string[]; title: string }[] = [];
  const openLines: string[] = [];
  let splitLines = 0;

  const secretCheck = (ref: string, text: string): boolean => {
    const reason = secretReason(text);
    if (!reason) return false;
    const allowed = allow.has(ref);
    flagged.push({ ref, reason, text: mask(text), allowed });
    return !allowed;
  };

  const baseFields = (id: string, source: Item["source"], createdAt: string, updatedAt: string, slugs: string[], method: "manual" | "keyword" = "manual", scores: Record<string, number> = {}) => ({
    id,
    categories: [...new Set(slugs)],
    source,
    classification: { method, scores },
    createdAt,
    updatedAt,
    deletedAt: null,
  });

  for (const row of rows) {
    const ref = row.ref;
    const isKeep = row.source === "keep";
    const category = row.category.trim();
    const action = (overrides.categoryMap?.[category] ?? category).trim();
    const text = row[CSV_TITLE] ?? "";
    if (block.has(ref)) {
      skipped.push({ ref, reason: "Left out by import-overrides.json", text: "" });
      continue;
    }
    if (action.toLowerCase() === "secret") {
      skipped.push({ ref, reason: "Holds a password or code", text: mask(text) });
      continue;
    }
    if (/^skip\b/i.test(action)) {
      skipped.push({ ref, reason: action.replace(/^skip:?\s*/i, "") || "Marked skip in the CSV", text });
      continue;
    }

    const isTask = row[CSV_KIND]?.trim().toUpperCase().startsWith("T") ?? false;
    // A blank category: no category, so it waits in the Inbox.
    const primarySlugs = () => [action ? slugFor(category) : "", row.secondary?.trim() ? slugFor(row.secondary.trim()) : ""].filter(Boolean);

    if (isKeep) {
      if (!keepDir) throw new Error(`The CSV lists Keep notes, but there's no "Keep JSON" folder in ${dir}`);
      const note = JSON.parse(readFileSync(path.join(keepDir, ref), "utf8"));
      const createdAt = usecToIso(note.createdTimestampUsec);
      const updatedAt = usecToIso(note.userEditedTimestampUsec);
      const lines: { text: string; isChecked: boolean }[] = (note.listContent ?? []).filter((l: { text: string }) => l.text?.trim());

      // The big to-do lists: one task per line, filed by keyword rules.
      if (action.toLowerCase() === "split") {
        lines.forEach((line, i) => {
          const lineRef = `${ref}#${i}`;
          if (block.has(lineRef)) {
            skipped.push({ ref: lineRef, reason: "Left out by import-overrides.json", text: "" });
            return;
          }
          if (secretCheck(lineRef, line.text)) return;
          const scores = keywordScores(line.text, categories.all().filter((c) => c.suggest));
          const chosen = overrides.categories?.[lineRef] ?? Object.keys(scores).filter((s) => scores[s] >= threshold);
          const lineText = line.text.trim();
          const long = lineText.length > 140;
          out.push({
            ...baseFields(`keep-${sha(ref)}-l${i}`, "keep-import", createdAt, updatedAt, chosen, "keyword", scores),
            kind: "task",
            title: long ? `${lineText.slice(0, 120).replace(/\s+\S*$/, "")}…` : lineText,
            notes: long ? lineText : "",
            tags: [],
            pinned: false,
            checklist: [],
            status: line.isChecked ? "done" : "open",
            dueDate: null,
            completedAt: line.isChecked ? updatedAt : null,
          });
          splitLines++;
          if (!line.isChecked) openLines.push(`${lineRef} → ${chosen.join(", ") || "Inbox"} | ${mask(lineText)}`);
        });
        continue;
      }

      const links: string[] = (note.annotations ?? []).map((a: { url?: string }) => a.url).filter(Boolean);
      let body: string = (note.textContent ?? "").trim();
      for (const url of links) if (!body.includes(url)) body += `${body ? "\n\n" : ""}${url}`;
      const whole = [note.title ?? "", body, ...lines.map((l) => l.text)].join("\n");
      if (secretCheck(ref, whole)) continue;

      const checklist: ChecklistEntry[] = lines.map((l, i) => ({ id: `c${i}`, text: l.text.trim(), checked: Boolean(l.isChecked) }));
      const slugs = overrides.categories?.[ref] ?? primarySlugs().map((s) => refine(s, `${note.title ?? ""}\n${body}`));
      let title: string = (note.title ?? "").trim();
      const tags = note.attachments?.length ? ["missing-image"] : [];
      const base = baseFields(`keep-${sha(ref)}`, "keep-import", createdAt, updatedAt, slugs);

      if (isTask) {
        if (!title) {
          const split = splitTitle(body, 120);
          title = split.title || lines[0]?.text.trim() || body.slice(0, 80);
          body = split.title ? split.rest : body;
        }
        const allChecked = checklist.length > 0 && checklist.every((e) => e.checked);
        const done = Boolean(note.isArchived) || allChecked;
        const primary = bySlug.get(slugs[0]);
        out.push({ ...base, kind: primary?.kind === "list" ? "list-item" : "task", title, notes: body, tags, pinned: Boolean(note.isPinned), checklist, status: done ? "done" : "open", dueDate: null, completedAt: done ? updatedAt : null });
      } else {
        out.push({ ...base, kind: "note", title, body, links: extractLinks({ title, body }), tags, pinned: Boolean(note.isPinned), checklist, status: note.isArchived ? "archived" : "active", archivedAt: note.isArchived ? updatedAt : null });
      }
      continue;
    }

    // WhatsApp: one item per row; a row can merge follow-up messages.
    const ids = messageRefs(ref);
    const group = ids.map((i) => messages[i]);
    if (group.some((m) => !m)) throw new Error(`The CSV's ${ref} isn't in the chat`);
    const files: string[] = [];
    const written = group
      .map((m) =>
        m.text
          .replace(PHOTO_FILE, (_, a?: string, b?: string) => {
            files.push((a ?? b)!);
            return "";
          })
          .replace(OTHER_MEDIA, "")
          .trim(),
      )
      .filter(Boolean)
      .join("\n\n");
    const raw = [overrides.texts?.[ref], written].filter(Boolean).join("\n\n");
    if (secretCheck(ref, raw)) continue;

    const attachedNote = files.map((f) => `Photo: ${f} (kept in the WhatsApp export folder)`).join("\n");
    const named = overrides.titles?.[ref];
    const split = named ? { title: named, rest: raw } : splitTitle(raw, isTask ? 120 : 80);
    let { title } = split;
    const rest = [split.rest, attachedNote].filter(Boolean).join("\n\n");
    if (files.length > 0) photos.push({ ref, files, title: named ?? "" });
    if (!title && isTask) title = files[0] ?? rest.slice(0, 80);

    const slugs = overrides.categories?.[ref] ?? primarySlugs().map((s) => refine(s, raw));
    const tags = files.length > 0 ? ["has-photo"] : [];
    const base = baseFields(`${chatPrefix}${ids.join("-")}`, "whatsapp-import", group[0].createdAt, group[group.length - 1].createdAt, slugs);

    if (isTask) {
      const primary = bySlug.get(slugs[0]);
      out.push({ ...base, kind: primary?.kind === "list" ? "list-item" : "task", title, notes: rest, tags, pinned: false, checklist: [], status: "open", dueDate: null, completedAt: null });
    } else {
      out.push({ ...base, kind: "note", title, body: rest, links: extractLinks({ title, body: rest }), tags, pinned: false, checklist: [], status: "active", archivedAt: null });
    }
  }

  // ---- Report ----
  const count = <T>(list: T[], key: (t: T) => string) => {
    const m = new Map<string, number>();
    for (const t of list) m.set(key(t), (m.get(key(t)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const perCategory = count(out.flatMap((i) => (i.categories.length ? i.categories : ["(no category)"])), (s) => s);
  const withheld = flagged.filter((f) => !f.allowed);
  const lines = [
    "# Overplanner import report",
    "",
    `${apply ? "Applied" : "Dry run"}: ${out.length} items to import, ${skipped.length} skipped, ${withheld.length} withheld by the secret scan.`,
    "",
    "## Items by source, kind and status",
    ...count(out, (i) => `${i.source} · ${i.kind === "note" ? "note" : "task"} · ${i.status}`).map(([k, n]) => `- ${k}: ${n}`),
    `- Lines split out of the 5 big to-do lists: ${splitLines}`,
    "",
    "## Items by category",
    ...perCategory.map(([k, n]) => `- ${bySlug.get(k)?.name ?? k}: ${n}`),
    "",
    "## Withheld by the secret scan (masked). Move anything real to a password manager",
    ...withheld.map((f) => `- ${f.ref} (${f.reason}): ${f.text}`),
    "",
    "## Flagged, then allowed by import-overrides.json",
    ...flagged.filter((f) => f.allowed).map((f) => `- ${f.ref} (${f.reason})`),
    "",
    "## Skipped",
    ...skipped.map((s) => `- ${s.ref}: ${s.reason}${s.text ? `: ${s.text}` : ""}`),
    "",
    "## Photos (the notes point to these files)",
    ...photos.map((p) => `- ${p.ref}: ${p.files.join(", ")}${p.title ? ` → "${p.title}"` : " (no title set)"}`),
    "",
    "## Open lines from the big to-do lists",
    ...openLines.map((l) => `- ${l}`),
    "",
  ];
  writeFileSync(path.join(dir, "import-report.md"), lines.join("\n"));

  console.log(lines.join("\n"));

  if (!apply) {
    console.log("Dry run: nothing was written to the data folder.");
    return;
  }
  const result = await items.importItems(out);
  console.log(`Imported ${result.added} items into ${config.dataDir}; ${result.existing} were already there.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
