import type { BackupStatus } from "../../shared/types";

// True when the most recent attempt failed (an older failure followed by a
// good backup doesn't count).
export function backupFailed(b: BackupStatus): boolean {
  if (!b.lastError || !b.lastAttemptAt) return false;
  return !b.lastSuccessAt || b.lastAttemptAt > b.lastSuccessAt;
}
