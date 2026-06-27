import { useEffect } from "react";

import { invoke, inTauri } from "@/lib/tauri";
import { useAppStore, ThemeCode } from "@/stores/app";

export const THEME_CODES: ThemeCode[] = [
  "dark",
  "light",
  "nord",
  "solarized",
  "black",
];

// hex → "r g b" triples consumed by Tailwind's `rgb(var(--primary) / X)`.
// Keeping both hex (for `--accent-color`) and triples (for `--primary`)
// so any place still reading `--accent-color` stays consistent.
const VALID_ACCENT_NAMES = [
  "indigo",
  "blue",
  "purple",
  "pink",
  "rose",
  "orange",
  "amber",
  "emerald",
  "teal",
  "cyan",
];

// Per-theme inline palette has been moved to index.css to rely purely on CSS-driven styling.

export function applyThemeClass(theme: ThemeCode) {
  const root = document.documentElement;
  const body = document.body;
  THEME_CODES.forEach((t) => {
    root.classList.remove(`theme-${t}`);
    body?.classList.remove(`theme-${t}`);
  });
  root.classList.add(`theme-${theme}`);
  body?.classList.add(`theme-${theme}`);
  if (theme === "light") {
    root.classList.remove("dark");
    body?.classList.remove("dark");
  } else {
    root.classList.add("dark");
    body?.classList.add("dark");
  }
  root.dataset.theme = theme;

  try {
    localStorage.setItem("weave.theme", theme);
  } catch {
    /* noop */
  }
}

function applyAccent(accent: string) {
  const root = document.documentElement;
  // If the accent is valid, or is "theme", use it. Otherwise fall back to "indigo".
  const hasAccent = VALID_ACCENT_NAMES.includes(accent);
  const resolvedAccent = hasAccent || accent === "theme" ? accent : "indigo";
  root.dataset.accent = resolvedAccent;
}

// Subscribe directly to the store so any theme change is reflected on the
// <html> element synchronously, even if no React component re-renders.
let subscribed = false;
function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  let lastTheme = useAppStore.getState().theme;
  let lastAccent = useAppStore.getState().accent;
  useAppStore.subscribe((state) => {
    if (state.theme !== lastTheme) {
      lastTheme = state.theme;
      applyThemeClass(state.theme);
    }
    if (state.accent !== lastAccent) {
      lastAccent = state.accent;
      applyAccent(state.accent);
    }
  });
}

export function useApplyTheme() {
  const theme = useAppStore((s) => s.theme);
  const accent = useAppStore((s) => s.accent);
  useEffect(() => {
    ensureSubscribed();
    applyThemeClass(theme);
    applyAccent(accent);
  }, [theme, accent]);
}

export async function persistTheme(theme: ThemeCode) {
  applyThemeClass(theme);
  if (!inTauri) return;
  await invoke<void>("config_set", {
    path: "settings.general.appearance.theme",
    value: theme,
  }).catch(() => undefined);
}
