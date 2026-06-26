import { useState, useRef, useEffect } from "react";
import { RotateCcw, Keyboard, Mouse } from "lucide-react";
import { useTranslation } from "@/i18n/hooks";

import {
  useHotkeysStore,
  ACTION_LABEL_KEYS,
  ACTION_LABELS_FALLBACK,
  DEFAULT_HOTKEYS,
  codeToName,
  keyDisplayName,
} from "@/stores/hotkeys";
import type { HotkeyAction, HotkeyBinding } from "@/stores/hotkeys";
import { cn } from "@/lib/utils";

// ─── Action groups for visual grouping in the UI ──────────────────────────────
// Labels use translation keys; actual strings come from the component.

const ACTION_GROUPS: {
  labelKey: string;
  fallback: string;
  actions: HotkeyAction[];
}[] = [
  {
    labelKey: "settings.hotkeys_group_pagination",
    fallback: "Pagination",
    actions: ["page.prev", "page.next", "page.first", "page.last"],
  },
  {
    labelKey: "settings.hotkeys_group_navigation",
    fallback: "Navigation",
    actions: ["nav.workshop", "nav.collections", "nav.installed"],
  },
  {
    labelKey: "settings.hotkeys_group_general",
    fallback: "General",
    actions: [
      "refresh",
      "open_settings",
      "toggle_sidebar",
      "theme_cycle",
      "open_tasks",
      "open_multi_download",
    ],
  },
];

// ─── Key capture input ────────────────────────────────────────────────────────

/**
 * A button that, when pressed, captures the next keyboard or mouse event
 * and stores its normalised representation as the binding.
 */
function KeyCapture({
  value,
  onChange,
  label,
  t,
}: {
  value: string | null;
  onChange: (key: string | null) => void;
  label: string;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  const [capturing, setCapturing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!capturing) return;

    let captured = false;

    function handleKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setCapturing(false);
        return;
      }

      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.metaKey) parts.push("Cmd");

      // Use e.code → codeToName for layout independence.
      parts.push(codeToName(e.code));

      captured = true;
      onChange(parts.join("+"));
      setCapturing(false);
    }

    function handleMouseButton(e: MouseEvent) {
      if (captured) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.button === 2) {
        setCapturing(false);
        return;
      }

      if (e.button === 3) {
        captured = true;
        onChange("MouseBack");
        setCapturing(false);
        return;
      }
      if (e.button === 4) {
        captured = true;
        onChange("MouseForward");
        setCapturing(false);
        return;
      }
    }

    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("mouseup", handleMouseButton, true);
    document.addEventListener("auxclick", handleMouseButton, true);

    return () => {
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("mouseup", handleMouseButton, true);
      document.removeEventListener("auxclick", handleMouseButton, true);
    };
  }, [capturing, onChange]);

  const displayValue = value ?? "—";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => setCapturing(true)}
      className={cn(
        "flex h-8 min-w-[120px] items-center justify-center rounded-md border px-3 text-xs font-mono",
        capturing
          ? "border-primary bg-primary/10 text-primary animate-pulse"
          : "border-border bg-surface-sunken text-foreground hover:border-primary/50",
      )}
      title={
        capturing
          ? t("settings.hotkeys_press_key_for", { label })
          : t("settings.hotkeys_click_to_change")
      }
    >
      {capturing ? (
        <span className="flex items-center gap-1.5">
          <Keyboard className="h-3 w-3" />
          {t("settings.hotkeys_press_key")}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          {value?.startsWith("Mouse") && <Mouse className="h-3 w-3" />}
          {formatBinding(displayValue)}
        </span>
      )}
    </button>
  );
}

/** Pretty-print a binding string for display. */
function formatBinding(raw: string): string {
  if (raw === "—") return raw;
  // Split on "+" and convert each part through keyDisplayName.
  return raw
    .split("+")
    .map((part) => {
      if (part === "Ctrl") return "⌃";
      if (part === "Alt") return "⌥";
      if (part === "Shift") return "⇧";
      if (part === "Cmd") return "⌘";
      if (part === "MouseBack") return "⟵ Back";
      if (part === "MouseForward") return "⟶ Fwd";
      return keyDisplayName(part);
    })
    .join("");
}

// ─── Single row ───────────────────────────────────────────────────────────────

function HotkeyRow({
  action,
  binding,
  onSetPrimary,
  onSetSecondary,
  onClear,
  t,
}: {
  action: HotkeyAction;
  binding: HotkeyBinding | undefined;
  onSetPrimary: (key: string | null) => void;
  onSetSecondary: (key: string | null) => void;
  onClear: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  const fallback: HotkeyBinding = { primary: null, secondary: null };
  const b = binding ?? fallback;
  const defaultBinding = DEFAULT_HOTKEYS[action] ?? fallback;
  const label = t(ACTION_LABEL_KEYS[action]) || ACTION_LABELS_FALLBACK[action];

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex-1 truncate text-sm text-foreground">{label}</span>

      <KeyCapture
        value={b.primary}
        onChange={onSetPrimary}
        label={label}
        t={t}
      />

      <KeyCapture
        value={b.secondary}
        onChange={onSetSecondary}
        label={`${label} (secondary)`}
        t={t}
      />

      {(b.primary !== defaultBinding.primary ||
        b.secondary !== defaultBinding.secondary) && (
        <button
          type="button"
          onClick={onClear}
          className="btn-icon h-8 w-8"
          title={t("settings.hotkeys_reset_to_default")}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HotkeysSettings() {
  const { t } = useTranslation();
  const bindings = useHotkeysStore((s) => s.bindings);
  const setBinding = useHotkeysStore((s) => s.setBinding);
  const resetToDefaults = useHotkeysStore((s) => s.resetToDefaults);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {t("settings.hotkeys_description") ||
            "Click a binding, then press a key or mouse side button to reassign. Press Escape to cancel. Hotkeys work with any keyboard layout."}
        </p>
        <button
          type="button"
          onClick={resetToDefaults}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-subtle hover:bg-surface-raised"
        >
          <RotateCcw className="h-3 w-3" />
          {t("settings.hotkeys_reset") || "Reset All"}
        </button>
      </div>

      {ACTION_GROUPS.map((group) => (
        <div key={group.labelKey} className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            {t(group.labelKey as any) || group.fallback}
          </p>
          <div className="divide-y divide-border rounded-md border border-border bg-surface-sunken px-3">
            {group.actions.map((action) => (
              <HotkeyRow
                key={action}
                action={action}
                binding={bindings[action]}
                onSetPrimary={(key) =>
                  setBinding(action, {
                    ...bindings[action],
                    primary: key,
                  })
                }
                onSetSecondary={(key) =>
                  setBinding(action, {
                    ...bindings[action],
                    secondary: key,
                  })
                }
                onClear={() => {
                  const def = DEFAULT_HOTKEYS[action];
                  setBinding(action, def);
                }}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
