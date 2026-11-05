import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { CreateItemSchema, UpdateItemSchema } from "../shared/schemas";
import { ItemSchema } from "../shared/schemas";
import type { Item, Note, Task } from "../shared/types";
import { HttpError } from "./errors";

type CreateInput = z.output<typeof CreateItemSchema>;
type UpdateInput = z.output<typeof UpdateItemSchema>;

const TASK_ONLY = ["notes", "dueDate"] as const;
const NOTE_ONLY = ["body"] as const;

export function createItem(input: CreateInput, now: string): Item {
  const base = { id: input.id ?? randomUUID(), createdAt: input.createdAt ?? now, updatedAt: now, deletedAt: null };
  if (input.kind === "note") {
    if (!input.title && !input.body.trim() && input.checklist.length === 0) {
      throw new HttpError(400, "A note needs a title, a body or a checklist");
    }
    return { ...input, ...base, links: extractLinks(input), status: "active", archivedAt: null };
  }
  return { ...input, ...base, status: "open", completedAt: null };
}

// Applies a PATCH. Changing kind between task and note converts the item
// (notes <-> body, open/done <-> active/archived) and keeps its id. Status
// timestamps follow the status; a note's links follow its text.
export function applyPatch(prev: Item, patch: UpdateInput, now: string): Item {
  const toNote = patch.kind !== undefined && patch.kind === "note" && prev.kind !== "note";
  const toTask = patch.kind !== undefined && patch.kind !== "note" && prev.kind === "note";
  const base: Item = toNote ? taskToNote(prev as Task) : toTask ? noteToTask(prev as Note) : prev;

  const finalIsNote = (patch.kind ?? base.kind) === "note";
  const wrong = finalIsNote ? TASK_ONLY.filter((k) => k in patch) : NOTE_ONLY.filter((k) => k in patch);
  if (wrong.length > 0) {
    throw new HttpError(400, `${wrong.join(", ")} can't be set on a ${finalIsNote ? "note" : "task"}`);
  }

  const merged = { ...base, ...patch, updatedAt: now } as Record<string, unknown>;
  if (merged.status !== base.status) {
    merged.deletedAt = merged.status === "deleted" ? now : null;
    if (finalIsNote) merged.archivedAt = merged.status === "archived" ? now : null;
    else merged.completedAt = merged.status === "done" ? now : null;
  }
  if (finalIsNote) merged.links = extractLinks(merged as { title: string; body: string });

  // Validates the whole result: a "done" note or an "archived" task fails here.
  const next = ItemSchema.parse(merged);
  if (next.kind !== "note" && !next.title.trim()) throw new HttpError(400, "Title is required");
  if (next.kind === "note" && !next.title && !next.body.trim() && next.checklist.length === 0) {
    throw new HttpError(400, "A note needs a title, a body or a checklist");
  }
  return next;
}

function common(item: Item) {
  const { id, title, categories, tags, pinned, checklist, source, classification, createdAt, updatedAt, deletedAt } = item;
  return { id, title, categories, tags, pinned, checklist, source, classification, createdAt, updatedAt, deletedAt };
}

function taskToNote(task: Task): Note {
  const status = task.status === "done" ? "archived" : task.status === "deleted" ? "deleted" : "active";
  return {
    ...common(task),
    kind: "note",
    body: task.notes,
    links: [],
    status,
    archivedAt: status === "archived" ? (task.completedAt ?? task.updatedAt) : null,
  };
}

function noteToTask(note: Note): Task {
  const status = note.status === "archived" ? "done" : note.status === "deleted" ? "deleted" : "open";
  return {
    ...common(note),
    kind: "task",
    notes: note.body,
    status,
    dueDate: null,
    completedAt: status === "done" ? (note.archivedAt ?? note.updatedAt) : null,
  };
}

// URLs in a note's title and body, in order, without duplicates or trailing
// punctuation.
export function extractLinks({ title, body }: { title: string; body: string }): string[] {
  const found = `${title}\n${body}`.match(/https?:\/\/[^\s<>"'`]+/g) ?? [];
  const cleaned = found.map((u) => u.replace(/[.,;:!?)\]]+$/, ""));
  return [...new Set(cleaned)];
}

// Upgrades an item stored before notes and checklists existed (no `pinned`
// field). Old notes kept their text in `notes` and used open/done.
export function upgradeLegacyItem(raw: Record<string, unknown>): { item: unknown; upgraded: boolean } {
  if ("pinned" in raw) return { item: raw, upgraded: false };
  const base = { ...raw, pinned: false, checklist: [] as unknown[] };
  if (raw.kind !== "note") return { item: base, upgraded: true };

  const { notes, dueDate: _dueDate, completedAt, ...rest } = base as Record<string, unknown>;
  const body = typeof notes === "string" ? notes : "";
  const status = raw.status === "done" ? "archived" : raw.status === "deleted" ? "deleted" : "active";
  return {
    item: {
      ...rest,
      body,
      links: extractLinks({ title: String(raw.title ?? ""), body }),
      status,
      archivedAt: status === "archived" ? (completedAt ?? raw.updatedAt) : null,
    },
    upgraded: true,
  };
}
