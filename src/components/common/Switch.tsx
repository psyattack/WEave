import * as RadixSwitch from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: Props) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative h-5 w-9 rounded-full border border-border bg-surface-sunken transition-colors data-[state=checked]:bg-primary/60",
        className,
      )}
    >
      <RadixSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-surface shadow transition-transform data-[state=checked]:translate-x-4.5 data-[state=checked]:bg-primary-foreground" />
    </RadixSwitch.Root>
  );
}
