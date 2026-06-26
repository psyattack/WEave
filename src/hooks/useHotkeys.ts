import { useEffect, useRef } from "react";

import {
  useHotkeysStore,
  codeToName,
  findActionsForKey,
} from "@/stores/hotkeys";
import type { HotkeyAction } from "@/stores/hotkeys";

export type ActionHandler = (event?: MouseEvent | KeyboardEvent) => void;

/**
 * Global keyboard / mouse side-button listener.
 *
 * Uses `KeyboardEvent.code` (physical key position) instead of `e.key`
 * so that hotkeys work regardless of the active keyboard layout
 * (e.g. Russian, French, etc.).
 */
export function useHotkeys(
  handlers: Partial<Record<HotkeyAction, ActionHandler>>,
) {
  const handlersRef = useRef<Partial<Record<HotkeyAction, ActionHandler>>>({});
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Build modifier prefix from boolean flags — layout-independent.
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.metaKey) parts.push("Cmd");

      // Ignore modifier-only presses.
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

      // Derive the key name from `e.code` (physical position).
      parts.push(codeToName(e.code));

      dispatch(parts.join("+"), e);
    }

    // ─── Mouse side buttons ────────────────────────────────────────────────
    // MDN standard: button 3 = Back (X1), button 4 = Forward (X2).
    // We listen on `mouseup` + `auxclick` because WebView2 on Windows
    // often swallows `mousedown` for side buttons.
    let lastSideButton = 0;

    function handleSideButton(e: MouseEvent) {
      let name: string | null = null;
      if (e.button === 3) name = "MouseBack";
      else if (e.button === 4) name = "MouseForward";
      if (!name) return;

      // De-duplicate: `mouseup` + `auxclick` may fire together.
      const now = Date.now();
      if (now - lastSideButton < 150) return;
      lastSideButton = now;

      e.preventDefault();
      e.stopPropagation();
      dispatch(name, e);
    }

    function dispatch(key: string, event: MouseEvent | KeyboardEvent) {
      const bindings = useHotkeysStore.getState().bindings;
      const actions = findActionsForKey(key, bindings);
      for (const action of actions) {
        const handler = handlersRef.current[action];
        if (handler) handler(event);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mouseup", handleSideButton, true);
    document.addEventListener("auxclick", handleSideButton, true);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mouseup", handleSideButton, true);
      document.removeEventListener("auxclick", handleSideButton, true);
    };
  }, []);
}
