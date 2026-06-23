import type { HotkeyConfig } from "./types";

/**
 * Default hotkey bindings.
 *
 * Key names are derived from `KeyboardEvent.code` (physical key position)
 * via our `codeToName()` helper, so they work regardless of keyboard layout.
 *
 * Mouse side buttons use our custom "MouseBack" / "MouseForward" identifiers.
 */
export const DEFAULT_HOTKEYS: HotkeyConfig = {
  // Pagination (unified for Workshop, Collections & Author)
  "page.prev": { primary: "MouseBack", secondary: "ArrowLeft" },
  "page.next": { primary: "MouseForward", secondary: "ArrowRight" },
  "page.first": { primary: null, secondary: null },
  "page.last": { primary: null, secondary: null },

  // Navigation
  "nav.workshop": { primary: "Alt+1", secondary: null },
  "nav.collections": { primary: "Alt+2", secondary: null },
  "nav.installed": { primary: "Alt+3", secondary: null },

  // General
  refresh: { primary: "F5", secondary: null },
  open_settings: { primary: "Ctrl+S", secondary: null },
  toggle_sidebar: { primary: "Ctrl+B", secondary: null },
  theme_cycle: { primary: "Ctrl+Shift+E", secondary: null },
  open_tasks: { primary: "Ctrl+Shift+T", secondary: null },
  open_multi_download: { primary: "Ctrl+Shift+D", secondary: null },
};
