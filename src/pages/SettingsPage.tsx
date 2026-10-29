import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { ClassifyResult } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/dates";
import { useStore } from "../store/useStore";

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <>
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <Section title="Classification thresholds" description="How confident a category score must be to show as a chip.">
          <Slider
            label="Auto-select at or above"
            value={settings.autoSelectThreshold}
            min={settings.maybeThreshold}
            onChange={(v) => updateSettings({ autoSelectThreshold: v })}
          />
          <Slider
            label="Show as “Maybe” at or above"
            value={settings.maybeThreshold}
            max={settings.autoSelectThreshold}
            onChange={(v) => updateSettings({ maybeThreshold: v })}
          />
          <p className="text-xs text-stone-400">
            Scores below {settings.maybeThreshold.toFixed(2)} are hidden. If no chip reaches it, the item goes to Inbox.
          </p>
        </Section>

        <Section title="Backup" description="Copies data/ to this folder every 6 hours.">
          <input
            value={settings.backupPath}
            onChange={(e) => updateSettings({ backupPath: e.target.value })}
            placeholder="G:\My Drive\Overplanner"
            className="w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-sm outline-none focus:border-stone-400"
          />
        </Section>

        <JevSection />

        <Section title="Integrations">
          <Status label="Web Share Target" value="Not set up" />
          <Status label="Google Keep import" value="Not set up" />
          <Status label="WhatsApp import" value="Not set up" />
        </Section>

        <Section title="Categories" description="From data/categories.json.">
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs text-stone-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((c) => (
                  <tr key={c.slug}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.icon} {c.name}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-stone-500">{c.slug}</td>
                    <td className="px-4 py-2 text-stone-500">{c.kind}</td>
                    <td className="px-4 py-2 text-stone-500">{c.description}</td>
                    <td className="px-4 py-2 text-xs text-stone-400">{c.keywords.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
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
        <form onSubmit={test} className="space-y-3 border-t border-stone-100 pt-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400"
              aria-label="Test text"
            />
            <button
              type="submit"
              disabled={testing || !text.trim()}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-40"
            >
              {testing && <Loader2 className="size-3.5 animate-spin" />}
              Test
            </button>
          </div>
          {testError && <p className="text-xs text-red-600">{testError}</p>}
          {result && (
            <div className="space-y-1.5">
              <p className="text-xs text-stone-500">
                {result.jev.status === "ok" ? "JEV scores (merged with keyword rules):" : `JEV ${result.jev.status}: ${result.jev.error ?? ""}. Keyword scores:`}
              </p>
              {top.length === 0 && <p className="text-xs text-stone-400">No category scored above zero.</p>}
              {top.map(([slug, score]) => {
                const c = categories.find((x) => x.slug === slug);
                return (
                  <div key={slug} className="flex items-center gap-3 text-xs">
                    <span className="w-36 shrink-0 truncate">
                      {c?.icon} {c?.name ?? slug}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-stone-100">
                      <div className="h-1.5 rounded-full" style={{ width: `${score * 100}%`, backgroundColor: c?.color ?? "#78716c" }} />
                    </div>
                    <span className="w-10 text-right font-mono tabular-nums text-stone-500">{score.toFixed(2)}</span>
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

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Slider({
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
    <label className="flex items-center gap-4 text-sm">
      <span className="w-48 shrink-0 text-stone-600">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-stone-900"
      />
      <span className="w-10 text-right font-mono tabular-nums">{value.toFixed(2)}</span>
    </label>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-stone-600">{label}</span>
      <span className="text-stone-400">{value}</span>
    </div>
  );
}
