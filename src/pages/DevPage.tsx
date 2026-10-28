import { useState, type ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";

// Scratchpad, sketches, code notes and agents.md. Only the scratchpad is
// interactive for now, and it is not persisted until the local API exists.
export function DevPage() {
  const [scratch, setScratch] = useState("");

  return (
    <>
      <PageHeader title="Dev" subtitle="Scratchpad, sketches, code notes and agents.md." />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Scratchpad">
          <textarea
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder="Jot something down… (not saved yet)"
            className="h-48 w-full resize-y rounded-lg border border-stone-200 p-3 font-mono text-sm outline-none focus:border-stone-400"
          />
        </Panel>
        <Panel title="Sketches">
          <Placeholder>Drawing canvas goes here.</Placeholder>
        </Panel>
        <Panel title="Code notes">
          <Placeholder>Snippets and notes go here.</Placeholder>
        </Panel>
        <Panel title="agents.md">
          <Placeholder>Embedded agents.md goes here.</Placeholder>
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-stone-500">{title}</h2>
      {children}
    </section>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-stone-200 text-sm text-stone-400">
      {children}
    </div>
  );
}
