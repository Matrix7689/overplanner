import type { ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
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

        <Section title="JEV" description="TypeSafe AI classifier, called from the server.">
          <Status label="Connection" value="Not configured" />
        </Section>

        <Section title="Integrations">
          <Status label="Web Share Target" value="Not set up" />
          <Status label="Google Keep import" value="Not set up" />
          <Status label="WhatsApp import" value="Not set up" />
        </Section>

        <Section title="Categories" description="From data/categories.json.">
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-stone-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Description</th>
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
