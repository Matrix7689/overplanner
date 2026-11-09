import {
  CalendarDays,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { NavLink } from "react-router";
import type { CategoryDef, SidebarSection } from "../../shared/types";
import { inboxItems, openCountBySlug, useStore } from "../store/useStore";
import { Tooltip } from "../ui/Tooltip";
import { CategoryEditor } from "./CategoryEditor";

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
  const [adding, setAdding] = useState<CategoryDef["kind"] | null>(null);

  const counts = useMemo(() => openCountBySlug(items), [items]);
  const inboxCount = useMemo(() => inboxItems(items).length, [items]);

  const topCategories = categories.filter((c) => c.kind === "category" && c.parent === null);
  const lists = categories.filter((c) => c.kind === "list" && c.parent === null);
  const childrenOf = (slug: string) => categories.filter((c) => c.parent === slug);

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        className={`fixed inset-0 z-30 bg-(--overlay-bg) backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* The sidebar stays dark brown in both light and dark mode. */}
      <aside
        className={`surface-dark fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-linear-to-b from-brand-900 to-brand-950 shadow-[1px_0_0_0_var(--hairline)] transition-transform md:static md:translate-x-0 ${
          compact ? "md:w-16" : "md:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`flex items-center justify-between px-4 pt-5 pb-4 ${compact ? "md:justify-center md:px-0" : ""}`}>
          <NavLink to="/" draggable={false} className={`flex items-center gap-2.5 ${compact ? "md:hidden" : ""}`}>
            <img src="/favicon.svg" alt="" className="size-7 rounded-lg" />
            <span className="text-base font-semibold tracking-tight text-title">Overplanner</span>
          </NavLink>
          <Tooltip label={compact ? "Expand sidebar" : "Collapse sidebar"} side={compact ? "right" : "bottom"}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden rounded-lg p-1.5 text-caption transition-colors hover:bg-white/10 hover:text-title md:block"
              aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            >
              {compact ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-caption hover:bg-white/10 md:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className={`flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 ${compact ? "md:px-2" : ""}`}>
          <ul className="space-y-0.5">
            <MainLink to="/" icon={LayoutDashboard} label="Dashboard" compact={compact} end />
            <MainLink to="/inbox" icon={Inbox} label="Inbox" count={inboxCount} compact={compact} />
            <MainLink to="/search" icon={Search} label="Search" compact={compact} />
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
            <AddRow label="Add category" compact={compact} onClick={() => setAdding("category")} />
          </Section>

          <Section title="Lists" id="lists" icon={ListChecks} folded={folded.includes("lists")} onToggle={toggleSection} compact={compact}>
            {lists.map((c) => (
              <li key={c.slug}>
                <CategoryLink category={c} count={counts[c.slug]} compact={compact} />
              </li>
            ))}
            <AddRow label="Add list" compact={compact} onClick={() => setAdding("list")} />
          </Section>
        </nav>

        <div className={`border-t border-white/10 px-3 py-3 ${compact ? "md:px-2" : ""}`}>
          <ul className="space-y-0.5">
            <MainLink to="/settings" icon={Settings} label="Settings" compact={compact} />
          </ul>
        </div>
      </aside>

      {adding && <CategoryEditor newKind={adding} onClose={() => setAdding(null)} />}
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
    <section className={compact ? "md:mt-3 md:border-t md:border-white/10 md:pt-3" : ""}>
      <h2 className={`mt-6 mb-1.5 ${compact ? "md:mt-0" : ""}`}>
        <Tooltip label={`${folded ? "Show" : "Hide"} ${title.toLowerCase()}`} enabled={compact}>
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-expanded={!folded}
            aria-label={title}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-lg font-bold tracking-tight text-title transition-colors hover:bg-white/8 ${
              compact ? "md:justify-center md:px-0 md:py-1.5" : ""
            } ${folded && compact ? "opacity-50" : ""}`}
          >
            <Icon className="size-5 shrink-0" />
            <span className={`flex-1 text-left ${compact ? "md:hidden" : ""}`}>{title}</span>
            <ChevronDown className={`size-4 text-caption transition-transform ${folded ? "-rotate-90" : ""} ${compact ? "md:hidden" : ""}`} />
          </button>
        </Tooltip>
      </h2>
      <ul className={`space-y-0.5 ${folded ? "hidden" : ""}`}>{children}</ul>
    </section>
  );
}

// A plain string, not NavLink's className function: the Tooltip's trigger merges
// classes as text, which would turn a function into nonsense. NavLink marks the
// current page with aria-current, so the active look keys off that instead.
const linkClass = (compact: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-body transition-colors hover:bg-white/8 hover:text-title aria-[current=page]:bg-brand-700/80 aria-[current=page]:font-medium aria-[current=page]:text-title aria-[current=page]:shadow-[inset_0_1px_0_0_var(--hairline)] ${
    compact ? "md:justify-center md:px-0" : ""
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
      <Tooltip label={label} enabled={compact}>
        <NavLink to={to} end={end} draggable={false} className={linkClass(compact)} aria-label={label}>
          <Icon className="size-4 shrink-0" />
          <span className={`flex-1 ${compact ? "md:hidden" : ""}`}>{label}</span>
          {count ? <Count value={count} compact={compact} /> : null}
        </NavLink>
      </Tooltip>
    </li>
  );
}

function CategoryLink({ category, count, compact }: { category: CategoryDef; count?: number; compact: boolean }) {
  return (
    <Tooltip label={category.name} enabled={compact}>
      <NavLink to={`/category/${category.slug}`} draggable={false} className={linkClass(compact)} aria-label={category.name}>
        {/* A colour dot; in the icons-only sidebar, the name's first letter on
            the category colour so categories stay tellable apart. */}
        <span className={`flex w-4 shrink-0 justify-center ${compact ? "md:hidden" : ""}`} aria-hidden>
          <span className="cat-dot size-2 rounded-full" style={{ backgroundColor: category.color }} />
        </span>
        {compact && (
          <span
            className="hidden size-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-title md:flex"
            style={{ backgroundColor: `${category.color}59` }}
            aria-hidden
          >
            {category.name.charAt(0)}
          </span>
        )}
        <span className={`flex-1 truncate ${compact ? "md:hidden" : ""}`}>{category.name}</span>
        {count ? <Count value={count} compact={compact} /> : null}
      </NavLink>
    </Tooltip>
  );
}

function AddRow({ label, compact, onClick }: { label: string; compact: boolean; onClick: () => void }) {
  return (
    <li>
      <Tooltip label={label} enabled={compact}>
        <button type="button" onClick={onClick} aria-label={label} className={`${linkClass(compact)} w-full text-caption`}>
          <Plus className="size-4 shrink-0" />
          <span className={`flex-1 text-left ${compact ? "md:hidden" : ""}`}>{label}</span>
        </button>
      </Tooltip>
    </li>
  );
}

function Count({ value, compact }: { value: number; compact: boolean }) {
  return (
    <span className={`rounded-full bg-white/10 px-1.5 text-[11px] font-medium tabular-nums text-body ${compact ? "md:hidden" : ""}`}>
      {value}
    </span>
  );
}
