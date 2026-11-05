import type { ReactNode } from "react";

export type Segment<T extends string> = { value: T; label: string; icon?: ReactNode };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Segment<T>[];
  label: string;
  // Hide labels on small screens, leaving just the icons.
  compactLabels?: boolean;
  className?: string;
};

// A row of mutually exclusive choices, with a raised pill on the current one.
export function Segmented<T extends string>({ value, onChange, options, label, compactLabels, className = "" }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex items-center gap-0.5 rounded-xl bg-soft p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
              active ? "card-shadow bg-surface text-title" : "text-caption hover:text-title"
            }`}
          >
            {o.icon}
            <span className={compactLabels ? "hidden sm:inline" : ""}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
