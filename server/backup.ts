import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { schedule, type ScheduledTask } from "node-cron";
import { BackupStateSchema } from "../shared/schemas";
import type { BackupState, BackupStatus } from "../shared/types";
import { HttpError } from "./errors";
import { readJsonFile, withWriteLock, writeJsonFile } from "./jsonFile";
import type { SettingsRepo } from "./settings";

// Every 6 hours, on the hour (00:00, 06:00, 12:00, 18:00 local time).
const SCHEDULE = "0 */6 * * *";
const INTERVAL_MS = 6 * 60 * 60 * 1000;

// Each backup is a new folder named overplanner-YYYY-MM-DD_HHMMSS in the
// backup folder, so a damaged data/ can never overwrite a good backup.
// Pruning only ever touches folders that match this name.
const SNAPSHOT = /^overplanner-\d{4}-\d{2}-\d{2}_\d{6}(?:-\d+)?$/;
const PARTIAL_SUFFIX = ".partial";

const EMPTY_STATE: BackupState = { lastSuccessAt: null, lastSuccessFolder: null, lastAttemptAt: null, lastError: null };

export class BackupService {
  private state: BackupState = EMPTY_STATE;
  private inFlight: Promise<BackupStatus> | null = null;
  private task: ScheduledTask | null = null;

  constructor(
    private readonly dataDir: string,
    private readonly settings: SettingsRepo,
  ) {}

  private get stateFile(): string {
    return path.join(this.dataDir, "backup.json");
  }

  async load(): Promise<void> {
    this.state = await readJsonFile(this.stateFile, BackupStateSchema, () => EMPTY_STATE);
  }

  // Starts the 6-hourly schedule, and catches up at once if the last good
  // backup is older than that (for example, the PC was off or asleep).
  start(): void {
    this.task = schedule(SCHEDULE, () => this.run("scheduled"), { name: "backup", noOverlap: true });
    const last = this.state.lastSuccessAt ? Date.parse(this.state.lastSuccessAt) : 0;
    if (Date.now() - last >= INTERVAL_MS) void this.run("startup");
  }

  status(): BackupStatus {
    const { backupPath, backupKeep } = this.settings.get();
    const next = this.task?.getNextRun();
    return {
      ...this.state,
      configured: backupPath.trim() !== "",
      path: backupPath,
      keep: backupKeep,
      running: this.inFlight !== null,
      nextRunAt: next ? next.toISOString() : null,
    };
  }

  // Runs a backup, or joins the one already running. Scheduled runs are
  // skipped quietly while no folder is set; a manual run reports it.
  run(reason: "scheduled" | "startup" | "manual"): Promise<BackupStatus> {
    if (!this.status().configured) {
      if (reason === "manual") throw new HttpError(400, "No backup folder set. Add one in Settings.");
      return Promise.resolve(this.status());
    }
    if (!this.inFlight) {
      // Clear the in-flight marker before reading the status, so the
      // result reports running: false.
      this.inFlight = this.backup()
        .finally(() => {
          this.inFlight = null;
        })
        .then(() => this.status());
    }
    return this.inFlight;
  }

  private async backup(): Promise<void> {
    const { backupPath, backupKeep } = this.settings.get();
    const attemptAt = new Date();
    try {
      const target = this.checkTarget(backupPath);
      await ensureFolder(target);

      const name = await freeName(target, snapshotName(attemptAt));
      const staging = await fs.mkdtemp(path.join(os.tmpdir(), "overplanner-backup-"));
      try {
        // Copy locally while holding the write lock, so the snapshot is
        // consistent; the slower copy to Drive happens after it's released.
        await withWriteLock(() => fs.cp(this.dataDir, staging, { recursive: true, filter: (src) => !src.endsWith(".tmp") }));
        const partial = path.join(target, name + PARTIAL_SUFFIX);
        await fs.cp(staging, partial, { recursive: true });
        await fs.rename(partial, path.join(target, name));
      } finally {
        await fs.rm(staging, { recursive: true, force: true });
      }

      await prune(target, backupKeep);
      await this.saveState({
        lastSuccessAt: attemptAt.toISOString(),
        lastSuccessFolder: path.join(target, name),
        lastAttemptAt: attemptAt.toISOString(),
        lastError: null,
      });
      console.log(`Backed up data to ${path.join(target, name)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Backup failed: ${message}`);
      await this.saveState({ ...this.state, lastAttemptAt: attemptAt.toISOString(), lastError: message }).catch((e) =>
        console.error("Could not save backup status:", e),
      );
    }
  }

  private checkTarget(backupPath: string): string {
    const target = backupPath.trim();
    if (!path.isAbsolute(target)) {
      throw new Error(`Backup folder must be a full path, like G:\\My Drive\\Overplanner (got "${target}").`);
    }
    const resolved = path.resolve(target);
    const rel = path.relative(this.dataDir, resolved);
    if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
      throw new Error("Backup folder can't be inside the data folder.");
    }
    return resolved;
  }

  private async saveState(next: BackupState): Promise<void> {
    await withWriteLock(() => writeJsonFile(this.stateFile, BackupStateSchema, next));
    this.state = next;
  }
}

// Creates the backup folder if missing, but only when its parent exists:
// a missing parent usually means Google Drive isn't running.
async function ensureFolder(target: string): Promise<void> {
  try {
    if ((await fs.stat(target)).isDirectory()) return;
    throw new Error(`Backup path is a file, not a folder: ${target}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const parent = path.dirname(target);
  try {
    await fs.stat(parent);
  } catch {
    throw new Error(`Can't reach ${parent}. Is Google Drive running?`);
  }
  await fs.mkdir(target);
}

// Keeps the newest `keep` snapshots and removes leftovers of failed runs.
// Anything else in the folder is left alone.
async function prune(target: string, keep: number): Promise<void> {
  const names = await fs.readdir(target);
  const snapshots = names.filter((n) => SNAPSHOT.test(n)).sort().reverse();
  const partials = names.filter((n) => n.endsWith(PARTIAL_SUFFIX) && SNAPSHOT.test(n.slice(0, -PARTIAL_SUFFIX.length)));
  for (const name of [...snapshots.slice(keep), ...partials]) {
    await fs.rm(path.join(target, name), { recursive: true, force: true });
  }
}

function snapshotName(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `overplanner-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Two backups in the same second get -2, -3, ...
async function freeName(target: string, base: string): Promise<string> {
  for (let i = 1; ; i++) {
    const name = i === 1 ? base : `${base}-${i}`;
    try {
      await fs.stat(path.join(target, name));
    } catch {
      return name;
    }
  }
}
