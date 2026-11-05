import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

export const TooltipProvider = RadixTooltip.Provider;

type Props = {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  // With this off the child renders on its own, with no tooltip.
  enabled?: boolean;
  children: ReactElement;
};

export function Tooltip({ label, side = "right", enabled = true, children }: Props) {
  if (!enabled) return children;
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className="pop-shadow data-[state=delayed-open]:animate-pop z-[70] rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-title"
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
