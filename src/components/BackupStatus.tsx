import { CloudUpload, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import { backupFailed } from "../lib/backup";
import { formatDateTime } from "../lib/dates";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";

const REFRESH_MS = 60_000;

// Last backup and Force Backup, in the top bar. There's only room for the text
// on large screens; below that it's on hover here and always in Settings > Backup,
// and the button turns amber if the last backup failed.
export function BackupStatus() {
  const backup = useStore((s) => s.backup);
  const refresh = useStore((s) => s.refreshBackup);
  const forceBackup = useStore((s) => s.forceBackup);

  // Scheduled backups happen in the background, and this stays on screen.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    const timer = setInterval(refreshIfVisible, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  if (!backup) return null;

  const failed = backupFailed(backup);
  const lastBackup = backup.lastSuccessAt ? `Last backed up at ${formatDateTime(backup.lastSuccessAt)}` : "Not backed up yet";
  const summary = !backup.configured
    ? "Backups are off. Set a folder in Settings."
    : backup.running
      ? "Backing up…"
      : failed
        ? `Last backup failed. ${backup.lastError ?? ""} ${lastBackup}`.trim()
        : lastBackup;

  return (
    <div title={summary} className="flex shrink-0 items-center gap-3 text-xs text-caption">
      <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
        {!backup.configured ? (
          <span>
            Backups are off.{" "}
            <Link to="/settings#backup" className="underline hover:text-title">
              Set a folder
            </Link>
          </span>
        ) : backup.running ? (
          <span>Backing up…</span>
        ) : (
          <>
            {failed && <span className="font-medium text-warn">Last backup failed</span>}
            <span>{lastBackup}</span>
          </>
        )}
      </div>
      <Button
        variant="outlined"
        size="xs"
        aria-label="Force Backup"
        onClick={() => void forceBackup()}
        disabled={!backup.configured || backup.running}
        className={failed && !backup.running ? "border-warn text-warn lg:border-line lg:text-title" : ""}
      >
        {backup.running ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" />}
        <span className="hidden sm:inline">Force Backup</span>
      </Button>
    </div>
  );
}
