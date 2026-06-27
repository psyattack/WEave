import React, { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/common/Tooltip";
import { Switch } from "@/components/common/Switch";
import { inTauri, invoke, tryInvoke } from "@/lib/tauri";



export function Row({
  label,
  children,
  description,
  badge,
  warningBadge,
  id,
}: {
  label: string;
  children: React.ReactNode;
  description?: string | null;
  badge?: string;
  warningBadge?: { text: string; tooltip: string };
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          {label}
          {badge && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase ring-1 ring-primary/20 ring-inset">
              {badge}
            </span>
          )}
          {warningBadge && (
            <Tooltip content={warningBadge.tooltip} side="top">
              <span
                className="inline-flex cursor-help items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-warning uppercase ring-1 ring-warning/30 ring-inset"
              >
                <HelpCircle className="size-2.5" />
                {warningBadge.text}
              </span>
            </Tooltip>
          )}
        </label>
        {description ? (
          <div className="mt-1 text-[11px] leading-relaxed text-muted">
            {description}
          </div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/40">
      <div className="rounded-t-lg border-b border-border/40 bg-surface-raised/30 px-4 py-3 text-xs font-semibold tracking-wide text-subtle uppercase">
        {title}
      </div>
      <div className="divide-y divide-border/40 px-4 pt-1 pb-3">{children}</div>
    </div>
  );
}

export function SettingSwitch({
  path,
  fallback,
  id,
}: {
  path: string;
  fallback: boolean;
  id?: string;
}) {
  const [value, setValue] = useState<boolean>(fallback);
  useEffect(() => {
    if (!inTauri) return;
    void tryInvoke<boolean>("config_get", { path }, fallback).then((v) => {
      if (typeof v === "boolean") setValue(v);
    });
  }, [path, fallback]);
  return (
    <Switch
      id={id}
      checked={value}
      onCheckedChange={(v) => {
        setValue(v);
        if (inTauri) {
          void invoke("config_set", { path, value: v }).catch(() => undefined);
        }
      }}
    />
  );
}
