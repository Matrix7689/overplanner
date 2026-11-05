import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { tv } from "tailwind-variants";

const checkbox = tv({
  base: "flex shrink-0 items-center justify-center border border-faint/60 bg-surface text-on-action transition-[background-color,border-color,transform] duration-150 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-90 data-[state=checked]:border-transparent data-[state=checked]:bg-accent data-[state=unchecked]:bg-transparent",
  variants: {
    round: { true: "size-5 rounded-full", false: "size-[1.125rem] rounded-md" },
  },
  defaultVariants: { round: false },
});

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  round?: boolean;
  label: string;
  className?: string;
};

export function Checkbox({ checked, onChange, round, label, className }: Props) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className={checkbox({ round, className })}
    >
      <RadixCheckbox.Indicator>
        <Check className="size-3" strokeWidth={3.5} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
