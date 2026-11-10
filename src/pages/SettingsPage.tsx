import { CloudUpload, Loader2, Palette, Pencil, Plug, Plus, Sparkles, SlidersHorizontal, SunMoon, Tags, Trash2, Type, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { CategoryDef, ClassifyResult, Theme } from "../../shared/types";
import { useLocation, useNavigate } from "react-router";
import { CategoryEditor } from "../components/CategoryEditor";
import { PageHeader } from "../components/PageHeader";
import { PaletteEditor } from "../components/PaletteEditor";
import { api } from "../lib/api";
import { backupFailed } from "../lib/backup";
import { formatDateTime } from "../lib/dates";
import { FONTS } from "../lib/fonts";
import { useStore } from "../store/useStore";
import { Button } from "../ui/Button";
import { confirmDialog } from "../ui/Confirm";
import { Segmented } from "../ui/Segmented";
import { Slider } from "../ui/Slider";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// The sections, in page order, for the navigation beside them. Each title's
// slug is its section's anchor; `label` shortens a long title in the nav.
const SECTIONS: { title: string; label?: string; icon: LucideIcon }[] = [
  { title: "Appearance", icon: SunMoon },
  { title: "Font", icon: Type },
  { title: "Theme colors", icon: Palette },
  { title: "Classification thresholds", label: "Classification", icon: SlidersHorizontal },
  { title: "Backup", icon: CloudUpload },
  { title: "JEV", icon: Sparkles },
  { title: "Integrations", icon: Plug },
  { title: "Categories", icon: Tags },
];

const sectionId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const setTheme = useStore((s) => s.setTheme);
  const { hash } = useLocation();

  // Opened from a search result such as /settings#backup: scroll to it.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <>
      <PageHeader title="Settings" />

      <div className="lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <SettingsNav />
      <div className="space-y-6">
        <Section title="Appearance" description="Saved in settings.json, so it follows you across devices.">
          <div>
            <Segmented label="Theme" value={settings.ui.theme} onChange={setTheme} options={THEMES} />
          </div>
          {settings.ui.theme === "system" && (
            <p className="text-xs text-faint">Follows your device's light or dark setting.</p>
          )}
        </Section>

        <Section title="Font" description="Bundled with the app, so it works offline. Applies straight away.">
          <FontPicker />
        </Section>

        <Section
          title="Theme colors"
          description="Pick a preset or type your own HEX codes. The previews update as you go, and Apply changes the whole app. The phone capture app keeps the default colors."
        >
          <PaletteEditor />
        </Section>

        <Section title="Classification thresholds" description="How confident a category score must be to show as a chip.">
          <ThresholdSlider
            label="Auto-select at or above"
            value={settings.autoSelectThreshold}
            min={settings.maybeThreshold}
            onChange={(v) => updateSettings({ autoSelectThreshold: v })}
          />
          <ThresholdSlider
            label="Show as “Maybe” at or above"
            value={settings.maybeThreshold}
            max={settings.autoSelectThreshold}
            onChange={(v) => updateSettings({ maybeThreshold: v })}
          />
          <p className="text-xs text-faint">
            Scores below {settings.maybeThreshold.toFixed(2)} are hidden. If no chip reaches it, the item goes to Inbox.
          </p>
        </Section>

        <BackupSection />

        <JevSection />

        <Section title="Integrations">
          <Status label="Phone capture and share menu" value="Install from /capture/ on your phone" />
          <Status label="Google Keep import" value="Not set up" />
          <Status label="WhatsApp import" value="Not set up" />
        </Section>

        <CategoriesSection />
      </div>
      </div>
    </>
  );
}

// Follows the scroll position and jumps to a section when clicked. A row of
// chips on small screens, a column beside the sections on large ones.
function SettingsNav() {
  const navigate = useNavigate();
  const [active, setActive] = useState(sectionId(SECTIONS[0].title));
  const ignoreScrollUntil = useRef(0);

  // The current section is the last one whose top has passed a line just below
  // the top of the scrolling area.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const update = () => {
      if (Date.now() < ignoreScrollUntil.current) return;
      const line = main.getBoundingClientRect().top + 120;
      let current = sectionId(SECTIONS[0].title);
      for (const { title } of SECTIONS) {
        const id = sectionId(title);
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      setActive(current);
    };
    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => main.removeEventListener("scroll", update);
  }, []);

  // Keep the current chip in view in the sideways-scrolling phone row.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const chip = navRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    const nav = navRef.current;
    if (chip && nav && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  const go = (id: string) => {
    // Don't let sections passing by during the smooth scroll flicker the nav.
    ignoreScrollUntil.current = Date.now() + 900;
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    void navigate({ hash: id }, { replace: true });
  };

  return (
    <nav
      ref={navRef}
      aria-label="Settings sections"
      className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-page/90 px-4 py-2 backdrop-blur-md md:-mx-8 md:px-8 lg:top-6 lg:mx-0 lg:mb-0 lg:flex-col lg:overflow-visible lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      {SECTIONS.map(({ title, label, icon: Icon }) => {
        const id = sectionId(title);
        return (
          <button
            key={id}
            type="button"
            aria-current={active === id ? "true" : undefined}
            onClick={() => go(id)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm whitespace-nowrap text-caption transition-colors hover:bg-soft hover:text-title focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=true]:bg-surface aria-[current=true]:font-medium aria-[current=true]:text-title aria-[current=true]:shadow-(--card-shadow)"
          >
            <Icon className="size-4 shrink-0" />
            {label ?? title}
          </button>
        );
      })}
    </nav>
  );
}

function FontPicker() {
  const font = useStore((s) => s.settings.ui.font);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div role="radiogroup" aria-label="Font" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {FONTS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={font === f.id}
          aria-label={f.label}
          onClick={() => updateSettings({ ui: { font: f.id } })}
          style={{ fontFamily: f.stack }}
          className={`rounded-xl border p-3 text-left transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            font === f.id ? "border-accent bg-soft" : "border-line"
          }`}
        >
          <span className="block text-sm font-semibold text-title">{f.label}</span>
          <span className="mt-0.5 block text-xs text-caption">Order new beans by Friday, 12:30</span>
        </button>
      ))}
    </div>
  );
}

function CategoriesSection() {
  const categories = useStore((s) => s.categories);
  const items = useStore((s) => s.items);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const editingCategory = categories.find((c) => c.slug === editing);

  const remove = async (c: CategoryDef) => {
    const inCategory = items.filter((it) => it.categories.includes(c.slug));
    const toInbox = inCategory.filter((it) => it.categories.length === 1).length;
    const others = inCategory.length - toInbox;
    const plural = (n: number) => `${n} item${n === 1 ? "" : "s"}`;
    const fate = [
      toInbox > 0 ? `${plural(toInbox)} will move to the Inbox` : "",
      others > 0 ? `${plural(others)} will stay in ${others === 1 ? "its" : "their"} other categories` : "",
    ].filter(Boolean);
    const ok = await confirmDialog({
      title: `Delete "${c.name}"?`,
      description:
        inCategory.length === 0
          ? "It has no items. This removes it from categories.json."
          : `No items are deleted: ${fate.join(" and ")}. This removes the category from categories.json.`,
      confirmLabel: "Delete category",
      danger: true,
    });
    if (ok) await deleteCategory(c.slug);
  };

  return (
    <Section title="Categories" description="Saved in data/categories.json. Deleting a category never deletes its items.">
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add category
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {categories
          .filter((c) => c.parent === null)
          .flatMap((top) => [top, ...categories.filter((c) => c.parent === top.slug)])
          .map((c) => {
            const hasChildren = categories.some((other) => other.parent === c.slug);
            return (
              <li key={c.slug} className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 ${c.parent ? "pl-5 sm:pl-7" : ""}`}>
                <span className="cat-dot mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-title">{c.name}</span>
                    <span className="font-mono text-[11px] text-faint">{c.slug}</span>
                    {(c.parent || c.kind === "list") && (
                      <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] text-caption">{c.parent ? "Subcategory" : "List"}</span>
                    )}
                    {!c.showOnDashboard && <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] text-caption">Not on Dashboard</span>}
                    {!c.suggest && <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] text-caption">Manual only</span>}
                  </p>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-caption">{c.description}</p>}
                  {c.keywords.length > 0 && <p className="mt-0.5 truncate text-xs text-faint">{c.keywords.join(", ")}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    aria-label={`Edit ${c.name}`}
                    title="Edit"
                    onClick={() => setEditing(c.slug)}
                    className="rounded-lg bg-soft p-2 text-body transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:hover:brightness-125"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.name}`}
                    title={hasChildren ? "Delete or move its subcategories first" : "Delete"}
                    disabled={hasChildren}
                    onClick={() => void remove(c)}
                    className="rounded-lg bg-danger-soft p-2 text-danger transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 dark:hover:brightness-125"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
      </ul>
      {editingCategory && <CategoryEditor category={editingCategory} onClose={() => setEditing(null)} />}
      {adding && <CategoryEditor onClose={() => setAdding(false)} />}
    </Section>
  );
}

function BackupSection() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const backup = useStore((s) => s.backup);
  const refresh = useStore((s) => s.refreshBackup);
  const forceBackup = useStore((s) => s.forceBackup);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Section
      title="Backup"
      description="Every 6 hours, data/ is copied into a new dated folder here. Use a Google Drive for desktop folder so it reaches the cloud."
    >
      <label className="block text-sm">
        <span className="text-body">Backup folder</span>
        <input
          value={settings.backupPath}
          onChange={(e) => updateSettings({ backupPath: e.target.value })}
          placeholder="G:\My Drive\Overplanner backups"
          className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2 font-mono text-sm text-title outline-none focus:border-accent"
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <span className="text-body">Backups to keep</span>
        <input
          type="number"
          min={1}
          max={1000}
          value={settings.backupKeep}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (n >= 1 && n <= 1000) updateSettings({ backupKeep: n });
          }}
          className="w-20 rounded-lg border border-line bg-transparent px-2 py-1 text-sm text-title outline-none focus:border-accent"
        />
        <span className="text-xs text-faint">Older overplanner-… folders are deleted. Nothing else in the folder is touched.</span>
      </label>

      {backup && (
        <div className="space-y-3 border-t border-line pt-3">
          <Status
            label="Last backup"
            value={backup.lastSuccessAt ? formatDateTime(backup.lastSuccessAt) : "None yet"}
          />
          {backup.lastSuccessFolder && <Status label="Saved to" value={backup.lastSuccessFolder} />}
          {backupFailed(backup) && (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
              Last attempt failed at {formatDateTime(backup.lastAttemptAt!)}: {backup.lastError}
            </p>
          )}
          <Status
            label="Next scheduled"
            value={backup.configured && backup.nextRunAt ? formatDateTime(backup.nextRunAt) : "Off until a folder is set"}
          />
          <Button variant="outlined" size="sm" onClick={() => void forceBackup()} disabled={!backup.configured || backup.running}>
            {backup.running && <Loader2 className="size-3.5 animate-spin" />}
            Back up now
          </Button>
        </div>
      )}
    </Section>
  );
}

const SAMPLE_TEXT = "Pick up Ethiopian beans before the Portland trip";

function JevSection() {
  const classifier = useStore((s) => s.classifier);
  const refresh = useStore((s) => s.refreshClassifier);
  const categories = useStore((s) => s.categories);
  const [text, setText] = useState(SAMPLE_TEXT);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const test = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setTesting(true);
    setTestError(null);
    try {
      setResult(await api.classify({ text, jev: true }));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    }
    setTesting(false);
    void refresh();
  };

  const jev = classifier?.jev;
  const last = jev?.lastCall;
  const top = result
    ? Object.entries(result.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <Section title="JEV" description="TypeSafe AI classifier, called from the server. The API key stays on the server.">
      <Status
        label="Connection"
        value={!jev ? "Unknown" : jev.configured ? `Configured (${jev.model})` : "Not configured. Add JEV_API_KEY to .env and restart the server."}
      />
      <Status
        label="Last call"
        value={
          !last
            ? "None since the server started"
            : last.ok
              ? `OK at ${formatDateTime(last.at)}: ${last.latencyMs} ms${last.model ? `, ${last.model}` : ""}${last.inputTokens ? `, ${last.inputTokens.toLocaleString()} input tokens` : ""}`
              : `Failed at ${formatDateTime(last.at)}: ${last.error}`
        }
      />
      <Status label="Corrections logged" value={String(classifier?.feedbackCount ?? 0)} />

      {jev?.configured && (
        <form onSubmit={test} className="space-y-3 border-t border-line pt-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 py-1.5 text-sm text-title outline-none focus:border-accent"
              aria-label="Test text"
            />
            <Button type="submit" variant="outlined" size="sm" disabled={testing || !text.trim()}>
              {testing && <Loader2 className="size-3.5 animate-spin" />}
              Test
            </Button>
          </div>
          {testError && <p className="text-xs text-danger">{testError}</p>}
          {result && (
            <div className="space-y-1.5">
              <p className="text-xs text-caption">
                {result.jev.status === "ok" ? "JEV scores (merged with keyword rules):" : `JEV ${result.jev.status}: ${result.jev.error ?? ""}. Keyword scores:`}
              </p>
              {top.length === 0 && <p className="text-xs text-faint">No category scored above zero.</p>}
              {top.map(([slug, score]) => {
                const c = categories.find((x) => x.slug === slug);
                return (
                  <div key={slug} className="flex items-center gap-3 text-xs">
                    <span className="w-36 shrink-0 truncate">
                      {c?.name ?? slug}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-soft">
                      <div className="h-1.5 rounded-full" style={{ width: `${score * 100}%`, backgroundColor: c?.color ?? "#78716c" }} />
                    </div>
                    <span className="w-10 text-right font-mono tabular-nums text-caption">{score.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </form>
      )}
    </Section>
  );
}

// Each section is addressable as /settings#<slug of its title>, which the top
// search links to (e.g. "Classification thresholds" -> #classification-thresholds).
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = sectionId(title);
  return (
    <section
      id={id}
      className="card-shadow scroll-mt-16 rounded-2xl border border-line bg-surface p-5 target:ring-2 target:ring-accent lg:scroll-mt-6"
    >
      <h2 className="text-base font-semibold text-title">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-caption">{description}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function ThresholdSlider({
  label,
  value,
  min = 0,
  max = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="w-full text-body sm:w-48 sm:shrink-0">{label}</span>
      <Slider label={label} value={value} min={min} max={max} step={0.05} onChange={onChange} />
      <span className="w-10 text-right font-semibold text-title tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-body">{label}</span>
      <span className="min-w-0 text-right break-words text-caption">{value}</span>
    </div>
  );
}
