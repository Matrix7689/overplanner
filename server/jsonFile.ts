import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

// Every write in the app goes through this one queue, so writes never
// interleave and each mutation sees the result of the previous one.
let tail: Promise<unknown> = Promise.resolve();

export function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn);
  tail = run.catch(() => undefined);
  return run;
}

// Reads and validates a JSON file. A missing file is created from `fallback`.
export async function readJsonFile<S extends z.ZodType>(
  file: string,
  schema: S,
  fallback: () => z.output<S> | Promise<z.output<S>>,
): Promise<z.output<S>> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const value = await fallback();
    await writeJsonFile(file, schema, value as z.input<S>);
    return value;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw.replace(/^﻿/, ""));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${(err as Error).message}`);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(`${file} failed validation:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

// Validates, then writes atomically: temp file in the same folder, then rename.
export async function writeJsonFile<S extends z.ZodType>(file: string, schema: S, value: z.input<S>): Promise<void> {
  const data = schema.parse(value);
  await fs.mkdir(path.dirname(file), { recursive: true });

  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2) + "\n", "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await renameWithRetry(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

// On Windows, antivirus, indexers or an open editor can briefly lock the
// target file, so rename gets a few retries before giving up.
async function renameWithRetry(from: string, to: string, attempts = 5): Promise<void> {
  for (let i = 1; ; i++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      const retryable = code === "EPERM" || code === "EBUSY" || code === "EACCES";
      if (!retryable || i >= attempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 50 * i));
    }
  }
}
