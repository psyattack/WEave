import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { HotkeyAction, HotkeyBinding, HotkeysState } from "./types";
import { DEFAULT_HOTKEYS } from "./defaults";

export type { HotkeyAction, HotkeyBinding } from "./types";
export { DEFAULT_HOTKEYS } from "./defaults";

// ─── Code → human-readable name ───────────────────────────────────────────────
// Maps `KeyboardEvent.code` values to short names used in bindings.

const PUNCT: Record<string, string> = {
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Slash: "/",
  Minus: "-",
  Equal: "=",
};

/**
 * Convert a `KeyboardEvent.code` string to a short, layout-independent name
 * that we store in bindings.
 *
 *   "KeyA"       → "A"
 *   "Digit5"     → "5"
 *   "F5"         → "F5"
 *   "ArrowLeft"  → "ArrowLeft"
 *   "Comma"      → ","
 */
export function codeToName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return PUNCT[code] ?? code;
}

/** Pretty-print a stored key name for the settings UI. */
const DISPLAY: Record<string, string> = {
  ...PUNCT,
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Backspace: "⌫",
  Enter: "↵",
  Space: "␣",
  Escape: "Esc",
  Tab: "⇥",
  Delete: "Del",
  Insert: "Ins",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  CapsLock: "Caps",
  NumLock: "Num",
  PrintScreen: "PrtSc",
};

export function keyDisplayName(key: string): string {
  return DISPLAY[key] ?? key;
}

// ─── Labels ───────────────────────────────────────────────────────────────────
// Translation keys for action labels. Use getActionLabel() with the translation
// hook to get localized strings.

export const ACTION_LABEL_KEYS: Record<HotkeyAction, string> = {
  "page.prev": "settings.hotkeys_action_page_prev",
  "page.next": "settings.hotkeys_action_page_next",
  "page.first": "settings.hotkeys_action_page_first",
  "page.last": "settings.hotkeys_action_page_last",
  "nav.workshop": "settings.hotkeys_action_nav_workshop",
  "nav.collections": "settings.hotkeys_action_nav_collections",
  "nav.installed": "settings.hotkeys_action_nav_installed",
  refresh: "settings.hotkeys_action_refresh",
  open_settings: "settings.hotkeys_action_open_settings",
  toggle_sidebar: "settings.hotkeys_action_toggle_sidebar",
  theme_cycle: "settings.hotkeys_action_theme_cycle",
  open_tasks: "settings.hotkeys_action_open_tasks",
  open_multi_download: "settings.hotkeys_action_open_multi_download",
};

// Fallback labels (used when translations are not available)
export const ACTION_LABELS_FALLBACK: Record<HotkeyAction, string> = {
  "page.prev": "Previous Page",
  "page.next": "Next Page",
  "page.first": "First Page",
  "page.last": "Last Page",
  "nav.workshop": "Go to Workshop",
  "nav.collections": "Go to Collections",
  "nav.installed": "Go to Installed",
  refresh: "Refresh",
  open_settings: "Open Settings",
  toggle_sidebar: "Toggle Sidebar",
  theme_cycle: "Cycle Theme",
  open_tasks: "Open Tasks",
  open_multi_download: "Open Multi-Download",
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useHotkeysStore = create<HotkeysState>()(
  persist(
    (set) => ({
      bindings: { ...DEFAULT_HOTKEYS },

      setBindings: (bindings) => set({ bindings }),

      setBinding: (action: HotkeyAction, binding: HotkeyBinding) =>
        set((state) => ({
          bindings: { ...state.bindings, [action]: binding },
        })),

      resetToDefaults: () => set({ bindings: { ...DEFAULT_HOTKEYS } }),
    }),
    {
      name: "weave.hotkeys",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const stored = (persisted as Record<string, unknown> | null)?.bindings;
        if (stored && typeof stored === "object") {
          return {
            ...current,
            bindings: {
              ...DEFAULT_HOTKEYS,
              ...stored,
            },
          } as typeof current;
        }
        return current;
      },
    },
  ),
);

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Return all actions that are bound to the given key string.
 */
export function findActionsForKey(
  key: string,
  bindings: Record<HotkeyAction, HotkeyBinding>,
): HotkeyAction[] {
  const result: HotkeyAction[] = [];
  for (const [action, binding] of Object.entries(bindings)) {
    if (!binding) continue;
    if (binding.primary === key || binding.secondary === key) {
      result.push(action as HotkeyAction);
    }
  }
  return result;
}
