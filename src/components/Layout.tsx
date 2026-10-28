import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="-ml-1 rounded-md p-1 text-stone-600 hover:bg-stone-100"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-semibold tracking-tight">Overplanner</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
