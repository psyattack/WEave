import { create } from "zustand";

/**
 * Tracks the state of the hidden Steam webview's automatic login into the
 * dedicated parser account. Mirrors the lifecycle of the `steam_auto_login`
 * call fired during bootstrap so the sidebar can surface a small status
 * section (spinner while logging in, signed-in / error states once it
 * settles).
 *
 *  - `logging-in`  — auto-login is in flight (animated spinner).
 *  - `logged-in`   — signed in to Steam.
 *  - `error`       — auto-login failed (bad/stale credentials, Steam Guard…).
 *  - `idle`        — nothing has happened yet (also the non-Tauri default).
 */
export type SteamSessionPhase = "idle" | "logging-in" | "logged-in" | "error";

export interface SteamAccountInfo {
  persona_name: string;
  account_name: string;
  steamid: string;
  profile_url: string;
  avatar_url: string;
}

interface SteamSessionStore {
  phase: SteamSessionPhase;
  account: SteamAccountInfo | null;
  setPhase: (phase: SteamSessionPhase) => void;
  setLoggingIn: () => void;
  setLoggedIn: (account: SteamAccountInfo | null) => void;
  setError: () => void;
}

export const useSteamSessionStore = create<SteamSessionStore>((set) => ({
  phase: "idle",
  account: null,
  setPhase: (phase) => set({ phase }),
  setLoggingIn: () => set({ phase: "logging-in" }),
  setLoggedIn: (account) =>
    set({
      phase: account ? "logged-in" : "error",
      account: account ?? null,
    }),
  setError: () => set({ phase: "error", account: null }),
}));
