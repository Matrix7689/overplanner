import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useThemeSync } from "../lib/theme";
import { useStore } from "../store/useStore";
import { ItemEditor } from "./ItemEditor";
import { Sidebar } from "./Sidebar";
import { TopSearch } from "./TopSearch";

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  useThemeSync();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top navigation bar: search everything, on every page. */}
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2.5 md:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="-ml-1 shrink-0 rounded-md p-1 text-stone-600 hover:bg-stone-100 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <TopSearch />
        </header>

        <ItemEditor />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Notice />
            <Content />
          </div>
        </main>
      </div>
    </div>
  );
}

function Content() {
  const status = useStore((s) => s.status);
  const loadError = useStore((s) => s.loadError);
  const load = useStore((s) => s.load);

  if (status === "loading") return <p className="py-20 text-center text-sm text-stone-400">Loading…</p>;

  if (status === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-stone-600">Couldn't reach the Overplanner server.</p>
        <p className="mt-1 text-xs text-stone-400">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Retry
        </button>
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
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="flex-1">{notice}</p>
      <button type="button" onClick={dismiss} className="rounded p-0.5 hover:bg-red-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
