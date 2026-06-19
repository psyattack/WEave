/**
 * Action identifiers that can be bound to hotkeys.
 * Pagination actions are unified — Workshop, Collections and Author views
 * share the same bindings because they all operate on whichever view is
 * currently visible.
 */
export type HotkeyAction =
  | "page.prev"
  | "page.next"
  | "page.first"
  | "page.last"
  | "nav.workshop"
  | "nav.collections"
  | "nav.installed"
  | "refresh"
  | "open_settings"
  | "toggle_sidebar"
  | "theme_cycle"
  | "open_tasks"
  | "open_multi_download";

export interface HotkeyBinding {
  /** Primary key — physical code name or "MouseBack"/"MouseForward" */
  primary: string | null;
  /** Optional secondary binding */
  secondary: string | null;
}

/** Full hotkey configuration — maps action → binding */
export type HotkeyConfig = Record<HotkeyAction, HotkeyBinding>;

export interface HotkeysState {
  bindings: HotkeyConfig;
  setBindings: (config: HotkeyConfig) => void;
  setBinding: (action: HotkeyAction, binding: HotkeyBinding) => void;
  resetToDefaults: () => void;
}
