import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  // A small line above the title, such as the date.
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, eyebrow, subtitle, actions }: Props) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wider text-accent uppercase">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-title">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-caption">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
