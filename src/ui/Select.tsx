import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { tv } from "tailwind-variants";

// Radix doesn't allow an item with an empty value, so "" maps to this inside.
const EMPTY = "__empty__";

export type SelectOption = { value: string; label: string; color?: string; indent?: boolean };

const trigger = tv({
  base: "inline-flex max-w-full items-center justify-between gap-1.5 border border-line bg-surface text-body transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[placeholder]:text-caption",
  variants: {
    size: {
      xs: "h-7 rounded-full px-2.5 text-xs",
      sm: "h-8 rounded-lg px-2.5 text-xs",
    },
  },
  defaultVariants: { size: "sm" },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  // Shown when value is "" and no option has that value (a "+ Add" style picker).
  placeholder?: string;
  size?: "xs" | "sm";
  className?: string;
};

export function Select({ value, onChange, options, label, placeholder, size, className }: Props) {
  const hasEmptyOption = options.some((o) => o.value === "");
  return (
    <RadixSelect.Root
      value={value === "" ? (hasEmptyOption ? EMPTY : "") : value}
      onValueChange={(v) => onChange(v === EMPTY ? "" : v)}
    >
      <RadixSelect.Trigger aria-label={label} className={trigger({ size, className })}>
        <span className="truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown className="size-3.5 shrink-0 text-caption" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="pop-shadow data-[state=open]:animate-pop z-[60] max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-line bg-surface"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value || EMPTY}
                value={o.value || EMPTY}
                className={`flex cursor-default items-center gap-2 rounded-lg py-1.5 pr-7 text-sm text-body outline-none select-none data-[highlighted]:bg-soft data-[highlighted]:text-title data-[state=checked]:font-medium ${
                  o.indent ? "pl-6" : "pl-2.5"
                } relative`}
              >
                {o.color && <span className="cat-dot size-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />}
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2">
                  <Check className="size-3.5 text-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
