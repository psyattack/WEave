import React from "react";
import { MetaRow } from "@/hooks/useDetailsMeta";

export default function DetailsMetaGrid({ rows }: { rows: MetaRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-1 text-[11px]">
      {rows.map((row) => {
        const [label, value, tone] = row;
        const isNode = typeof value !== "string" || React.isValidElement(value);

        return (
          <div
            key={label + (typeof value === "string" ? value : "")}
            className="flex flex-col gap-0.5 rounded-md border border-white/5 bg-white/5 px-2 py-1 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]"
          >
            <span className="text-[9px] uppercase tracking-wide text-white/50">
              {label}
            </span>
            {isNode ? (
              <div className="truncate text-foreground/90 font-medium">{value}</div>
            ) : (
              <span
                className={
                  tone === "warning"
                    ? "truncate font-semibold text-warning"
                    : "truncate text-foreground font-medium"
                }
              >
                {(value as string) || "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
