import { create } from "zustand";

/**
 * Tracks the state of the hidden Steam webview's automatic login into the
 * dedicated parser account. Mirrors the lifecycle of the `steam_auto_login`
 * call fired during bootstrap so the sidebar can surface a small status
 * section (spinner while logging in, signed-in / unknown-account / error
 * states once it settles).
 *
 *  - `logging-in`  — auto-login is in flight (animated spinner).
 *  - `logged-in`   — signed in and Steam returned a concrete account.
 *  - `unknown`     — signed in, but Steam didn't return account details
 *                    (the parser may be running anonymously).
 *  - `error`       — auto-login failed (bad/stale credentials, Steam Guard…).
 *  - `idle`        — nothing has happened yet (also the non-Tauri default).
 */
export type SteamSessionPhase =
  | "idle"
  | "logging-in"
  | "logged-in"
  | "unknown"
  | "error";

export interface SteamAccountInfo {
  persona_name: string;
  account_name: string;
  steamid: string;
  profile_url: string;
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
      // Steam may report a successful session without resolving the concrete
      // account (anonymous-looking cookies). Treat that as a distinct state.
      phase: account ? "logged-in" : "unknown",
      account: account ?? null,
    }),
  setError: () => set({ phase: "error", account: null }),
}));
