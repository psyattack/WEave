import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { invoke, inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { useDotnetStore } from "@/stores/dotnet";
import { pushToast } from "@/stores/toasts";
import { useUpdaterStore } from "@/stores/updater";
import { useAppStore, ThemeCode } from "@/stores/app";
import { TaskPhase, useTasksStore } from "@/stores/tasks";
import { useInstalledStore } from "@/stores/installed";
import { useSteamSessionStore, SteamAccountInfo } from "@/stores/steam-session";
import i18n, { SupportedLanguage } from "@/i18n";
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
      const infiniteRetryAccounts = await tryInvoke<boolean>(
        "config_get",
        { path: "settings.account.account.infinite_retry_accounts" },
        false,
      );
      const accounts = await tryInvoke<
        { index: number; username: string; is_custom: boolean }[]
      >("accounts_list", undefined, []);

      // Set language from config — auto-detect on first launch
      const savedLanguage = getConfigValue<string | null>(
        config,
        ["general", "appearance", "language"],
        null,
      );
      const language = savedLanguage ?? detectSystemLanguage();
      void i18n.changeLanguage(language);

      // Persist auto-detected language to backend config on first launch
      if (!savedLanguage && inTauri) {
        void invoke("config_set", {
          path: "settings.general.appearance.language",
          value: language,
        }).catch(() => undefined);
      }

      const appearance = getConfigValue<Record<string, unknown>>(
        config,
        ["general", "appearance"],
        {},
      );
      const patch: Record<string, unknown> = {
        weDirectory: weDirectory ?? "",
        availableLanguages: availableLanguages ?? [],
        accountIndex: typeof accountIndex === "number" ? accountIndex : 0,
        infiniteRetryAccounts: typeof infiniteRetryAccounts === "boolean" ? infiniteRetryAccounts : false,
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
          useDotnetStore.getState().setStatus({
            phase: event.payload.phase as any,
            message: event.payload.message,
            progress: event.payload.progress ?? null,
          });
        }),
        listen<{
          phase: string;
          plugin_id: string;
          plugin_name: string;
          message: string;
          progress?: number | null;
        }>("plugin://status", (event) => {
          useDotnetStore.getState().setPluginStatus({
            phase: event.payload.phase as any,
            plugin_id: event.payload.plugin_id,
            plugin_name: event.payload.plugin_name,
            message: event.payload.message,
            progress: event.payload.progress ?? null,
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
            pushToast(
              i18n.t("bootstrap.download_failed", {
                id: event.payload.pubfileid,
                status: event.payload.status,
              }),
              "error",
            );
          } else if (normalizedPhase === "cancelled") {
            pushToast(
              i18n.t("bootstrap.download_cancelled", {
                id: event.payload.pubfileid,
              }),
              "warning",
            );
          } else if (normalizedPhase === "completed") {
            pushToast(
              i18n.t("bootstrap.download_completed", {
                id: event.payload.pubfileid,
              }),
              "success",
            );
            // The newly-downloaded item should now show the Installed
            // indicator on cards regardless of which view we're in.
            // We refresh the installed store so cards update their
            // installed indicators, and fetch workshop metadata for
            // the new item so it's cached for future use.
            void useInstalledStore.getState().refresh();
            void maybeAutoApply(event.payload.pubfileid);
          }
        }),

        listen<{ payload: string }>(
          "download://require_app_confirm",
          () => {
            pushToast(
              "Please approve the login in your Steam Mobile App.",
              "info",
            );
          },
        ),
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
            pushToast(
              i18n.t("bootstrap.extract_failed", {
                id: event.payload.pubfileid,
                status: event.payload.status,
              }),
              "error",
            );
          } else if (normalizedPhase === "completed") {
            pushToast(
              i18n.t("bootstrap.extract_completed", {
                id: event.payload.pubfileid,
              }),
              "success",
            );
          }
        }),
      ]);
    })();
  }, []);
}

/**
 * Auto-detect the best matching language from the system/browser locale.
 * Falls back to "en" when no supported language matches.
 */
function detectSystemLanguage(): SupportedLanguage {
  const browserLang =
    navigator.language ?? navigator.languages?.[0] ?? undefined;
  if (!browserLang) return "en";
  // navigator.language is typically "ru", "en-US", "en-GB", etc.
  const code = browserLang.split(/[-_]/)[0]?.toLowerCase();
  const supported: SupportedLanguage[] = ["en", "ru"];
  return supported.includes(code as SupportedLanguage)
    ? (code as SupportedLanguage)
    : "en";
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
    // First check if we have a valid session by hitting Steam directly.
    // This is more reliable than trusting the cookie alone.
    let info = await tryInvoke<SteamAccountInfo | null>(
      "steam_current_account",
      undefined,
      null,
    );

    if (info) {
      // Session is valid — we're already logged in.
      session.setLoggedIn(info);
      return;
    }

    // No valid session found. Try auto-login with the parser credentials.
    // `accountIndex: null` → use the dedicated parser credentials.
    let ok = await tryInvoke<boolean>(
      "steam_auto_login",
      { accountIndex: null },
      false,
    );

    // Verify the session is actually valid after auto-login.
    if (ok) {
      info = await tryInvoke<SteamAccountInfo | null>(
        "steam_current_account",
        undefined,
        null,
      );
      if (info) {
        session.setLoggedIn(info);
        return;
      }
      // Cookie existed but session was stale — force re-login.
      ok = await tryInvoke<boolean>(
        "steam_auto_login",
        { accountIndex: null, force: true },
        false,
      );
    }

    if (ok) {
      info = await tryInvoke<SteamAccountInfo | null>(
        "steam_current_account",
        undefined,
        null,
      );
      session.setLoggedIn(info ?? null);
    } else {
      session.setError();
    }
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
