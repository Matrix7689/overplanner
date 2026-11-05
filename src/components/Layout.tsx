import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useThemeSync } from "../lib/theme";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";
import { ConfirmHost } from "../ui/Confirm";
import { TooltipProvider } from "../ui/Tooltip";
import { ItemEditor } from "./ItemEditor";
import { Sidebar } from "./Sidebar";
import { TopSearch } from "./TopSearch";

const ITEM_REFRESH_MS = 60_000;

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  useThemeSync();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [pathname]);

  // Pick up items captured on the phone: when the window comes back into view,
  // and once a minute while it's open.
  const refreshItems = useStore((s) => s.refreshItems);
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshItems();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    const timer = setInterval(refreshIfVisible, ITEM_REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      clearInterval(timer);
    };
  }, [refreshItems]);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top navigation bar: search everything, on every page. */}
        <header className="relative z-20 flex items-center gap-3 border-b border-line/70 bg-(--glass-bg) px-4 py-2.5 backdrop-blur-xl md:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="-ml-1 shrink-0 rounded-lg p-1.5 text-body hover:bg-soft md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <TopSearch />
        </header>

        <ConfirmHost />

        <ItemEditor />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-9">
            <Notice />
            <Content />
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}

function Content() {
  const status = useStore((s) => s.status);
  const loadError = useStore((s) => s.loadError);
  const load = useStore((s) => s.load);

  if (status === "loading") return <p className="py-20 text-center text-sm text-faint">Loading…</p>;

  if (status === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-body">Couldn't reach the Overplanner server.</p>
        <p className="mt-1 text-xs text-faint">{loadError}</p>
        <Button onClick={() => void load()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return <Outlet />;
}

function Notice() {
  const notice = useStore((s) => s.notice);
  const dismiss = useStore((s) => s.dismissNotice);
  if (!notice) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <p className="flex-1">{notice}</p>
      <button type="button" onClick={dismiss} className="rounded p-0.5 hover:brightness-95" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
