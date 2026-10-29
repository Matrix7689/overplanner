import {
  CalendarDays,
  Code2,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router";
import type { CategoryDef } from "../../shared/types";
import { inboxItems, openCountBySlug, useStore } from "../store/useStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: Props) {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);

  const counts = useMemo(() => openCountBySlug(items), [items]);
  const inboxCount = useMemo(() => inboxItems(items).length, [items]);

  const topCategories = categories.filter((c) => c.kind === "category" && c.parent === null);
  const lists = categories.filter((c) => c.kind === "list" && c.parent === null);
  const childrenOf = (slug: string) => categories.filter((c) => c.parent === slug);

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        className={`fixed inset-0 z-30 bg-stone-900/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform md:static md:w-64 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <NavLink to="/" className="text-lg font-semibold tracking-tight">
            Overplanner
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-stone-500 hover:bg-stone-100 md:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <SearchBox />
          <ul className="space-y-0.5">
            <MainLink to="/" icon={LayoutDashboard} label="Dashboard" end />
            <MainLink to="/inbox" icon={Inbox} label="Inbox" count={inboxCount} />
            <MainLink to="/calendar" icon={CalendarDays} label="Calendar" />
            <MainLink to="/results" icon={TrendingUp} label="Results" />
          </ul>

          <SectionHeading>Categories</SectionHeading>
          <ul className="space-y-0.5">
            {topCategories.map((c) => (
              <li key={c.slug}>
                <CategoryLink category={c} count={counts[c.slug]} />
                {childrenOf(c.slug).length > 0 && (
                  <ul className="ml-4 space-y-0.5">
                    {childrenOf(c.slug).map((child) => (
                      <li key={child.slug}>
                        <CategoryLink category={child} count={counts[child.slug]} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <SectionHeading>Lists</SectionHeading>
          <ul className="space-y-0.5">
            {lists.map((c) => (
              <li key={c.slug}>
                <CategoryLink category={c} count={counts[c.slug]} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-stone-200 px-3 py-3">
          <ul className="space-y-0.5">
            <MainLink to="/dev" icon={Code2} label="Dev" />
            <MainLink to="/settings" icon={Settings} label="Settings" />
          </ul>
        </div>
      </aside>
    </>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    navigate(q ? `/search?${new URLSearchParams({ q })}` : "/search");
    setText("");
  };

  return (
    <form onSubmit={submit} className="relative mb-3">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search"
        aria-label="Search"
        className="w-full rounded-md border border-stone-200 bg-stone-50 py-1.5 pr-2 pl-8 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400 focus:bg-white"
      />
    </form>
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="mt-6 mb-1 px-3 text-xs font-medium tracking-wide text-stone-400 uppercase">
      {children}
    </h2>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm ${
    isActive ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
  }`;

function MainLink({
  to,
  icon: Icon,
  label,
  count,
  end,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  count?: number;
  end?: boolean;
}) {
  return (
    <li>
      <NavLink to={to} end={end} className={linkClass}>
        <Icon className="size-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {count ? <Count value={count} /> : null}
      </NavLink>
    </li>
  );
}

function CategoryLink({ category, count }: { category: CategoryDef; count?: number }) {
  return (
    <NavLink to={`/category/${category.slug}`} className={linkClass}>
      <span className="w-4 shrink-0 text-center" aria-hidden>
        {category.icon}
      </span>
      <span className="flex-1 truncate">{category.name}</span>
      {count ? <Count value={count} /> : null}
    </NavLink>
  );
}

function Count({ value }: { value: number }) {
  return <span className="text-xs tabular-nums text-stone-400">{value}</span>;
}
