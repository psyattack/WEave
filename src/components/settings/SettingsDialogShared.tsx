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
            <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20">
              {badge}
            </span>
          )}
          {warningBadge && (
            <Tooltip content={warningBadge.tooltip} side="top">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning ring-1 ring-inset ring-warning/30 cursor-help"
              >
                <HelpCircle className="h-2.5 w-2.5" />
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
      <div className="flex-shrink-0">{children}</div>
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
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle border-b border-border/40 bg-surface-raised/30 rounded-t-lg">
        {title}
      </div>
      <div className="divide-y divide-border/40 px-4 pb-3 pt-1">{children}</div>
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
