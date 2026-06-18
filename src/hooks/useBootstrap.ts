import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

import { invoke, inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { useAppStore, ThemeCode } from "@/stores/app";
import { TaskPhase, useTasksStore } from "@/stores/tasks";
import { useInstalledStore } from "@/stores/installed";
import { useSteamSessionStore, SteamAccountInfo } from "@/stores/steam-session";
import i18n from "@/i18n";
import { maybeMinimize } from "@/lib/window";

export function useBootstrap() {
  const dotnetInitialized = useRef(false);

  useEffect(() => {
    void (async () => {
      if (!inTauri) {
        useAppStore.setState({ ready: true });
        return;
      }

      const config = await tryInvoke<Record<string, unknown>>("config_get_all");
      const availableLanguages = await tryInvoke<
        { code: string; label: string }[]
      >("i18n_get_available_languages", undefined, []);
      const weDirectory = await tryInvoke<string | null>(
        "we_get_directory",
        undefined,
        null,
      );
      const accountIndex = await tryInvoke<number>(
        "config_get",
        { path: "settings.account.account.account_number" },
        0,
      );
      const accounts = await tryInvoke<
        { index: number; username: string; is_custom: boolean }[]
      >("accounts_list", undefined, []);

      // Set language from config
      const language = getConfigValue<string>(
        config,
        ["general", "appearance", "language"],
        "en",
      );
      void i18n.changeLanguage(language);

      const appearance = getConfigValue<Record<string, unknown>>(
        config,
        ["general", "appearance"],
        {},
      );
      const patch: Record<string, unknown> = {
        weDirectory: weDirectory ?? "",
        availableLanguages: availableLanguages ?? [],
        accountIndex: typeof accountIndex === "number" ? accountIndex : 0,
        accounts: accounts ?? [],
        language: language,
        ready: true,
      };
      // Only override persisted theme/accent when the backing config has an
      // explicit value. Otherwise we would clobber the user's in-session
      // selection on next bootstrap.
      if (appearance.theme) patch.theme = appearance.theme as ThemeCode;
      if (appearance.accent) patch.accent = appearance.accent as string;
      useAppStore.setState(patch);

      // Sign the hidden Steam webview into the dedicated parser account
      // (weworkshopmanager2) on startup so 18+ content is visible and the
      // scraper has a valid session. `accountIndex: null` tells the backend
      // to use the parser credentials rather than the currently-selected
      // download account. If login requires Steam Guard or the password is
      // stale this simply returns false — the user can still log in manually
      // via Settings → Steam web session.
      //
      // We drive the sidebar status section from this lifecycle: spinner
      // while in flight, then signed-in / unknown-account / error once it
      // settles. Kept fire-and-forget so it never blocks the rest of boot.
      void syncSteamSession();

      // Restore saved window geometry if the feature is on.
      void invoke("app_restore_window_geometry").catch(() => undefined);

      // Auto-check for updates on startup if enabled.
      void maybeCheckForUpdates();

      // Initialize .NET Runtime and plugins check after all event listeners are set up
      // Only call once to prevent duplicate initialization
      if (!dotnetInitialized.current) {
        dotnetInitialized.current = true;
        void invoke("dotnet_init").catch(() => undefined);
        void invoke("plugins_init").catch(() => undefined);
      }

      // Persist window state on close if enabled.
      void registerWindowStatePersistence();

      // Prime the global "what's installed" cache so any view can render
      // installed-indicators before the user opens the Installed tab.
      void useInstalledStore.getState().refresh();

      await Promise.all([
        listen<{
          phase: string;
          message: string;
          progress?: number | null;
        }>("dotnet://status", (event) => {
          void import("@/stores/dotnet").then(({ useDotnetStore }) => {
            useDotnetStore.getState().setStatus({
              phase: event.payload.phase as any,
              message: event.payload.message,
              progress: event.payload.progress ?? null,
            });
          });
        }),
        listen<{
          phase: string;
          plugin_id: string;
          plugin_name: string;
          message: string;
          progress?: number | null;
        }>("plugin://status", (event) => {
          void import("@/stores/dotnet").then(({ useDotnetStore }) => {
            useDotnetStore.getState().setPluginStatus({
              phase: event.payload.phase as any,
              plugin_id: event.payload.plugin_id,
              plugin_name: event.payload.plugin_name,
              message: event.payload.message,
              progress: event.payload.progress ?? null,
            });
          });
        }),
        listen<{
          pubfileid: string;
          status: string;
          account: string;
          phase: string;
          progress?: number | null;
        }>("download://status", (event) => {
          const normalizedPhase = normalizeTaskPhase(event.payload.phase);
          useTasksStore.getState().upsert({
            ...event.payload,
            kind: "download",
            phase: normalizedPhase,
          });
          if (normalizedPhase === "failed") {
            void import("@/stores/toasts").then(({ pushToast }) => {
              pushToast(
                `Download failed (${event.payload.pubfileid}): ${event.payload.status}`,
                "error",
              );
            });
          } else if (normalizedPhase === "cancelled") {
            void import("@/stores/toasts").then(({ pushToast }) => {
              pushToast(
                `Download cancelled: ${event.payload.pubfileid}`,
                "warning",
              );
            });
          } else if (normalizedPhase === "completed") {
            void import("@/stores/toasts").then(({ pushToast }) => {
              pushToast(
                `Download completed: ${event.payload.pubfileid}`,
                "success",
              );
            });
            // The newly-downloaded item should now show the Installed
            // indicator on cards regardless of which view we're in.
            // We refresh the installed store so cards update their
            // installed indicators, and fetch workshop metadata for
            // the new item so it's cached for future use.
            void useInstalledStore.getState().refresh();
            void (async () => {
              await tryInvoke(
                "workshop_get_item",
                { pubfileid: event.payload.pubfileid },
                null,
              );
            })();
            void maybeAutoApply(event.payload.pubfileid);
          }
        }),
        listen<{
          pubfileid: string;
          status: string;
          account: string;
          phase: string;
          progress?: number | null;
        }>("extract://status", (event) => {
          const normalizedPhase = normalizeTaskPhase(event.payload.phase);
          useTasksStore.getState().upsert({
            ...event.payload,
            kind: "extract",
            phase: normalizedPhase,
          });
          if (normalizedPhase === "failed") {
            void import("@/stores/toasts").then(({ pushToast }) => {
              pushToast(
                `Extract failed (${event.payload.pubfileid}): ${event.payload.status}`,
                "error",
              );
            });
          } else if (normalizedPhase === "completed") {
            void import("@/stores/toasts").then(({ pushToast }) => {
              pushToast(
                `Extract completed: ${event.payload.pubfileid}`,
                "success",
              );
            });
          }
        }),
      ]);
    })();
  }, []);
}

function getConfigValue<T>(
  config: Record<string, unknown> | null | undefined,
  path: string[],
  fallback: T,
): T {
  let current: unknown = config;
  for (const key of path) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, key)
    ) {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined || current === null ? fallback : (current as T);
}

function normalizeTaskPhase(value: string): TaskPhase {
  if (
    value === "starting" ||
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "running";
}

export async function changeLanguageTo(code: string) {
  useAppStore.setState({ language: code });
  await i18n.changeLanguage(code);
  if (inTauri) {
    await invoke<void>("config_set", {
      path: "settings.general.appearance.language",
      value: code,
    }).catch(() => undefined);
    await invoke<void>("i18n_set_language", { language: code }).catch(
      () => undefined,
    );
  }
}

interface UpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  release_notes: string;
  html_url: string;
  error: string | null;
}

/**
 * Run the parser auto-login and reflect every stage into the Steam-session
 * store so the sidebar status section can render a spinner / signed-in /
 * unknown-account / error state. Pure UI plumbing — the actual session and
 * cookie handling stays in the backend.
 */
async function syncSteamSession() {
  const session = useSteamSessionStore.getState();
  if (!inTauri) {
    session.setPhase("idle");
    return;
  }
  session.setLoggingIn();
  try {
    // `accountIndex: null` → use the dedicated parser credentials. Returns
    // false when login couldn't be completed (stale password, Steam Guard
    // prompt, no credentials configured, …).
    const ok = await tryInvoke<boolean>(
      "steam_auto_login",
      { accountIndex: null },
      false,
    );
    if (!ok) {
      // Auto-login itself failed; but a session from a previous run may have
      // been restored from disk, so double-check before flagging an error.
      const loggedIn = await tryInvoke<boolean>(
        "steam_is_logged_in",
        undefined,
        false,
      );
      if (!loggedIn) {
        session.setError();
        return;
      }
    }
    // Ask Steam itself who we're signed in as. A null result means the
    // session is attached but Steam didn't resolve a concrete account — the
    // store maps that to the "unknown" state.
    const info = await tryInvoke<SteamAccountInfo | null>(
      "steam_current_account",
      undefined,
      null,
    );
    session.setLoggedIn(info ?? null);
  } catch {
    session.setError();
  }
}

async function maybeCheckForUpdates() {
  if (!inTauri) return;
  const enabled = await tryInvoke<boolean>(
    "config_get",
    { path: "settings.general.behavior.auto_check_updates" },
    true,
  );
  if (!enabled) return;
  const info = await tryInvoke<UpdateInfo>("updater_check", undefined);
  if (info?.update_available) {
    const { useUpdaterStore } = await import("@/stores/updater");
    useUpdaterStore.getState().show(info);
  }
}

async function maybeAutoApply(pubfileid: string) {
  if (!inTauri || !pubfileid) return;
  const enabled = await tryInvoke<boolean>(
    "config_get",
    { path: "settings.general.behavior.auto_apply_last_downloaded" },
    false,
  );
  if (!enabled) return;
  // Need the freshly-installed wallpaper's project.json path. Pull the
  // current installed list and find the matching pubfileid.
  type Installed = { pubfileid: string; project_json_path: string };
  const installed = await tryInvoke<Installed[]>(
    "we_list_installed",
    undefined,
    [],
  );
  const match = (installed ?? []).find((w) => w.pubfileid === pubfileid);
  if (!match) return;
  const ok = await tryInvokeOk("we_apply", {
    projectPath: match.project_json_path,
    monitor: null,
    force: false,
  });
  if (ok) {
    void maybeMinimize();
  }
}

async function registerWindowStatePersistence() {
  if (!inTauri) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();

    const save = async () => {
      const enabled = await tryInvoke<boolean>(
        "config_get",
        { path: "settings.general.behavior.save_window_state" },
        true,
      );
      if (!enabled) return;

      // Don't save if window is minimized (positions are -32000)
      const pos = await win.outerPosition();
      if (pos.x < -30000 || pos.y < -30000) {
        return;
      }

      const [size, maximized] = await Promise.all([
        win.outerSize(),
        win.isMaximized(),
      ]);
      void invoke("app_save_window_geometry", {
        geom: {
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height,
          is_maximized: Boolean(maximized),
        },
      });
    };

    // Save periodically when window state changes
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;
    const debouncedSave = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        void save();
      }, 500);
    };

    await win.onResized(() => debouncedSave());
    await win.onMoved(() => debouncedSave());
  } catch (err) {
    console.warn("window state persistence setup failed", err);
  }
}
