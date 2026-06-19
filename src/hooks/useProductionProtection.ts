import { useEffect } from "react";

/**
 * Hook that disables DevTools, context menu, and certain keyboard shortcuts
 * ONLY in production builds. In development mode (npm run tauri dev) this
 * hook does nothing, allowing normal debugging workflow.
 *
 * Listeners are attached in capture phase so they fire before the global
 * hotkeys handler and can reliably suppress events.
 */

/** Keys blocked in production (DevTools / security). */
const BLOCKED = new Set(["F12", "u", "s", "a"]);

export function useProductionProtection() {
  useEffect(() => {
    // Only apply protection in production builds
    if (import.meta.env.DEV) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I / J / C  (DevTools)
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
        e.preventDefault();
        return;
      }

      // Ctrl+U, Ctrl+S, Ctrl+A
      if (e.ctrlKey && BLOCKED.has(e.key)) {
        e.preventDefault();
        return;
      }
    };

    // Use capture phase so these fire BEFORE the global hotkeys handler.
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}
