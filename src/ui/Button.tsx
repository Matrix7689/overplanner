import type { ButtonHTMLAttributes } from "react";
import { tv, type VariantProps } from "tailwind-variants";

// Tailus's 3D solid button: a soft top-to-bottom gradient, an inset highlight
// and a one-pixel edge, on the palette's action colours.
export const button = tv({
  base: "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-medium whitespace-nowrap transition-[filter,background-color,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
  variants: {
    variant: {
      solid:
        "bg-linear-to-b from-(--action-from) to-(--action-to) text-on-action [box-shadow:rgb(255_255_255/0.22)_0_1px_0_0_inset,var(--action-border)_0_0_0_1px,0_6px_14px_-8px_rgb(0_0_0/0.5)] hover:brightness-110",
      outlined: "border border-line bg-surface text-title card-shadow hover:bg-soft",
      soft: "bg-soft text-title hover:brightness-95 dark:hover:brightness-110",
      ghost: "text-body hover:bg-soft hover:text-title",
      danger:
        "bg-danger text-page [box-shadow:rgb(255_255_255/0.18)_0_1px_0_0_inset] hover:brightness-110",
    },
    size: {
      xs: "h-7 px-2.5 text-xs",
      sm: "h-8 px-3 text-sm",
      md: "h-9.5 px-4 text-sm",
    },
    icon: {
      true: "aspect-square px-0",
    },
  },
  defaultVariants: { variant: "solid", size: "md" },
});

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export function Button({ variant, size, icon, className, type = "button", ...props }: Props) {
  return <button type={type} className={button({ variant, size, icon, className })} {...props} />;
}
