import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";

type TooltipProps = {
  align?: "center" | "end" | "start";
  children: ReactElement;
  label: ReactNode;
  side?: "bottom" | "left" | "right" | "top";
};

export function Tooltip({ align = "center", children, label, side = "top" }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={180} skipDelayDuration={80}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            align={align}
            className="z-[90] max-w-64 rounded-lg border border-slate-700/70 bg-[#17181b] px-2.5 py-1.5 text-xs font-semibold leading-5 text-white shadow-xl shadow-black/20"
            side={side}
            sideOffset={8}
          >
            {label}
            <RadixTooltip.Arrow className="fill-[#17181b]" height={7} width={11} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
