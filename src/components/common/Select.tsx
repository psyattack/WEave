import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
}

const EMPTY_SENTINEL = "__empty__";

export default function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  icon,
}: Props) {
  const normalized = value === "" ? EMPTY_SENTINEL : value;
  return (
    <RadixSelect.Root
      value={normalized}
      onValueChange={(v) => onValueChange(v === EMPTY_SENTINEL ? "" : v)}
    >
      <RadixSelect.Trigger
        id={id}
        className={cn(
          "flex min-w-30 items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm outline-none hover:border-border-strong focus:ring-2 focus:ring-primary/30",
          className,
        )}
      >
        {icon}
        <RadixSelect.Value placeholder={placeholder} />
        <ChevronDown className="ml-auto size-4 text-muted" />
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-40 overflow-hidden rounded-md border border-border bg-surface shadow-card-hover"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value || EMPTY_SENTINEL}
                value={opt.value === "" ? EMPTY_SENTINEL : opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-highlighted:bg-surface-raised"
              >
                <RadixSelect.ItemIndicator className="size-4">
                  <Check className="size-4 text-primary" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
