import {
  CalendarDays,
  ChevronDown,
  Code2,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { NavLink } from "react-router";
import type { CategoryDef, SidebarSection } from "../../shared/types";
import { resolveTheme } from "../lib/theme";
import { inboxItems, openCountBySlug, useStore } from "../store/useStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

// "Compact" is the icons-only desktop sidebar. The phone drawer ignores it,
// which is why every compact style below uses the md: prefix.
export function Sidebar({ open, onClose }: Props) {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const compact = useStore((s) => s.settings.ui.sidebarCollapsed);
  const folded = useStore((s) => s.settings.ui.collapsedSections);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleSection = useStore((s) => s.toggleSection);

  const counts = useMemo(() => openCountBySlug(items), [items]);
  const inboxCount = useMemo(() => inboxItems(items).length, [items]);

  const topCategories = categories.filter((c) => c.kind === "category" && c.parent === null);
  const lists = categories.filter((c) => c.kind === "list" && c.parent === null);
  const childrenOf = (slug: string) => categories.filter((c) => c.parent === slug);

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform md:static md:translate-x-0 ${
          compact ? "md:w-14" : "md:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex items-center justify-between px-5 pt-5 pb-3 ${compact ? "md:justify-center md:px-0" : ""}`}>
          <NavLink to="/" className={`text-lg font-semibold tracking-tight ${compact ? "md:hidden" : ""}`}>
            Overplanner
          </NavLink>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800 md:block"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {compact ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-500 hover:bg-stone-100 md:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className={`flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 ${compact ? "md:px-2" : ""}`}>
          <ul className="space-y-0.5">
            <MainLink to="/" icon={LayoutDashboard} label="Dashboard" compact={compact} end />
            <MainLink to="/inbox" icon={Inbox} label="Inbox" count={inboxCount} compact={compact} />
            <MainLink to="/calendar" icon={CalendarDays} label="Calendar" compact={compact} />
            <MainLink to="/results" icon={TrendingUp} label="Results" compact={compact} />
          </ul>

          <Section title="Categories" id="categories" icon={LayoutGrid} folded={folded.includes("categories")} onToggle={toggleSection} compact={compact}>
            {topCategories.map((c) => (
              <li key={c.slug}>
                <CategoryLink category={c} count={counts[c.slug]} compact={compact} />
                {childrenOf(c.slug).length > 0 && (
                  <ul className={`ml-4 space-y-0.5 ${compact ? "md:ml-0" : ""}`}>
                    {childrenOf(c.slug).map((child) => (
                      <li key={child.slug}>
                        <CategoryLink category={child} count={counts[child.slug]} compact={compact} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </Section>

          <Section title="Lists" id="lists" icon={ListChecks} folded={folded.includes("lists")} onToggle={toggleSection} compact={compact}>
            {lists.map((c) => (
              <li key={c.slug}>
                <CategoryLink category={c} count={counts[c.slug]} compact={compact} />
              </li>
            ))}
          </Section>
        </nav>

        <div className={`border-t border-stone-200 px-3 py-3 ${compact ? "md:px-2" : ""}`}>
          <ul className="space-y-0.5">
            <MainLink to="/dev" icon={Code2} label="Dev" compact={compact} />
            <MainLink to="/settings" icon={Settings} label="Settings" compact={compact} />
            <li>
              <ThemeToggle compact={compact} />
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}

// A foldable group of links. In the icons-only sidebar the heading shrinks to
// its icon, which still folds and unfolds the section, and a folded section
// stays folded.
function Section({
  title,
  id,
  icon: Icon,
  folded,
  onToggle,
  compact,
  children,
}: {
  title: string;
  id: SidebarSection;
  icon: LucideIcon;
  folded: boolean;
  onToggle: (id: SidebarSection) => void;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <section className={compact ? "md:mt-3 md:border-t md:border-stone-200 md:pt-3" : ""}>
      <h2 className={`mt-6 mb-1 ${compact ? "md:mt-0" : ""}`}>
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={!folded}
          title={compact ? `${folded ? "Show" : "Hide"} ${title.toLowerCase()}` : undefined}
          aria-label={title}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-0.5 text-xs font-medium tracking-wide uppercase hover:text-stone-700 ${
            compact ? "md:justify-center md:px-0 md:py-1.5" : ""
          } ${folded && compact ? "text-stone-300" : "text-stone-400"}`}
        >
          <Icon className="size-4 shrink-0" />
          <span className={`flex-1 text-left ${compact ? "md:hidden" : ""}`}>{title}</span>
          <ChevronDown className={`size-3.5 transition-transform ${folded ? "-rotate-90" : ""} ${compact ? "md:hidden" : ""}`} />
        </button>
      </h2>
      <ul className={`space-y-0.5 ${folded ? "hidden" : ""}`}>{children}</ul>
    </section>
  );
}

// Flips between light and dark; the "System" choice lives in Settings.
function ThemeToggle({ compact }: { compact: boolean }) {
  const theme = useStore((s) => s.settings.ui.theme);
  const setTheme = useStore((s) => s.setTheme);
  const isDark = resolveTheme(theme) === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Light mode" : "Dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={compact ? label : undefined}
      aria-label={label}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-900 ${
        compact ? "md:justify-center md:px-0" : ""
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className={compact ? "md:hidden" : ""}>{label}</span>
    </button>
  );
}

const linkClass =
  (compact: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm ${compact ? "md:justify-center md:px-0" : ""} ${
      isActive ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
    }`;

function MainLink({
  to,
  icon: Icon,
  label,
  count,
  end,
  compact,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  end?: boolean;
  compact: boolean;
}) {
  return (
    <li>
      <NavLink to={to} end={end} className={linkClass(compact)} title={compact ? label : undefined} aria-label={label}>
        <Icon className="size-4 shrink-0" />
        <span className={`flex-1 ${compact ? "md:hidden" : ""}`}>{label}</span>
        {count ? <Count value={count} compact={compact} /> : null}
      </NavLink>
    </li>
  );
}

function CategoryLink({ category, count, compact }: { category: CategoryDef; count?: number; compact: boolean }) {
  return (
    <NavLink
      to={`/category/${category.slug}`}
      className={linkClass(compact)}
      title={compact ? category.name : undefined}
      aria-label={category.name}
    >
      {/* A colour dot; in the icons-only sidebar, the name's first letter on
          the category colour so categories stay tellable apart. */}
      <span className={`flex w-4 shrink-0 justify-center ${compact ? "md:hidden" : ""}`} aria-hidden>
        <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} />
      </span>
      {compact && (
        <span
          className="hidden size-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white md:flex"
          style={{ backgroundColor: category.color }}
          aria-hidden
        >
          {category.name.charAt(0)}
        </span>
      )}
      <span className={`flex-1 truncate ${compact ? "md:hidden" : ""}`}>{category.name}</span>
      {count ? <Count value={count} compact={compact} /> : null}
    </NavLink>
  );
}

function Count({ value, compact }: { value: number; compact: boolean }) {
  return <span className={`text-xs tabular-nums text-stone-400 ${compact ? "md:hidden" : ""}`}>{value}</span>;
}
