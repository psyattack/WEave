import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  children,
  content,
  side = "top",
  delay = 250,
}: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <RadixTooltip.Provider delayDuration={delay}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={8}
            className="z-[99999] pointer-events-none animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200"
          >
            <div className="relative drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              <div className="rounded-md bg-surface-raised/95 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm">
                {content}
              </div>
              <RadixTooltip.Arrow className="fill-surface-raised/95" />
            </div>
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
