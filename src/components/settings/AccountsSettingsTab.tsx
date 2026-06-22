import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

import { inTauri, invoke, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";
import { useConfirm } from "@/hooks/useConfirm";
import { useSteamSessionStore, SteamAccountInfo } from "@/stores/steam-session";

const persist = async (path: string, value: unknown) => {
  if (!inTauri) return;
  await invoke("config_set", { path, value }).catch(() => undefined);
};

export default function AccountsSettingsTab({
  onOpenParser,
}: {
  onOpenParser: () => void;
}) {
  const { t } = useTranslation();
  const state = useAppStore();

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          {t("settings.steam_session") || "Steam web session"}
        </p>
        <p className="text-xs text-muted">
          {t("settings.steam_session_description") ||
            "Log in to Steam so authenticated Workshop browsing (age-gated items) works the same as in a browser."}
        </p>
        <SteamSessionRow onOpenParser={onOpenParser} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          {t("settings.download_account") || "Download account"}
        </p>
        <p className="text-xs text-muted">
          {t("settings.download_account_description") ||
            "Pick a Steam account used for downloading. Custom credentials can be added below."}
        </p>
        <div className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
          <label className="flex cursor-pointer items-center gap-3 p-2.5 text-sm">
            <input
              type="radio"
              name="account"
              checked={
                state.accounts.find((a) => a.index === state.accountIndex)
                  ?.is_custom !== true
              }
              onChange={() => {
                state.setAccountIndex(0);
                void persist("settings.account.account.account_number", 0);
              }}
            />
            <span className="flex-1">
              {t("settings.auto_account") || "Auto"}
            </span>
          </label>
          {state.accounts
            .filter((a) => a.is_custom)
            .map((a) => (
              <label
                key={`${a.index}-${a.username}`}
                className="flex cursor-pointer items-center gap-3 p-2.5 text-sm"
              >
                <input
                  type="radio"
                  name="account"
                  checked={state.accountIndex === a.index}
                  onChange={() => {
                    state.setAccountIndex(a.index);
                    void persist(
                      "settings.account.account.account_number",
                      a.index,
                    );
                  }}
                />
                <span className="flex-1">{a.username}</span>
                <span className="chip text-info">
                  {t("settings.custom_badge") || "custom"}
                </span>
              </label>
            ))}
        </div>
      </div>
      <CustomAccountsSection />
    </div>
  );
}

function SteamSessionRow({ onOpenParser }: { onOpenParser: () => void }) {
  const { t } = useTranslation();
  const setAccounts = useAppStore((s) => s.setAccounts);
  const sessionPhase = useSteamSessionStore((s) => s.phase);
  const account = useSteamSessionStore((s) => s.account);
  const setSessionLoggedIn = useSteamSessionStore((s) => s.setLoggedIn);
  const [busy, setBusy] = useState(false);

  const refreshSession = useCallback(async () => {
    if (!inTauri) return;
    const v = await tryInvoke<boolean>("steam_is_logged_in", undefined, false);
    if (!v) {
      setSessionLoggedIn(null);
      return;
    }
    const info = await tryInvoke<{
      persona_name: string;
      account_name: string;
      steamid: string;
      profile_url: string;
      avatar_url: string;
    } | null>("steam_current_account", undefined, null);
    setSessionLoggedIn(info ?? null);
  }, [setSessionLoggedIn]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Listen for manual login success from the parser window
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;

    if (inTauri) {
      void listen("steam-login-success", async () => {
        await invoke<number>("steam_sync_cookies").catch(() => 0);
        pushToast(
          t("messages.signed_in_to_steam") || "Signed in to Steam",
          "success",
        );
        const list = await tryInvoke<
          { index: number; username: string; is_custom: boolean }[]
        >("accounts_list", undefined, []);
        if (list) setAccounts(list);
        await refreshSession();
      }).then((fn) => {
        if (active) {
          unlisten = fn;
        } else {
          fn();
        }
      });
    }

    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, [t, setAccounts, refreshSession]);

  const openParser = async () => {
    if (!inTauri) return;
    await invoke<void>("steam_parser_show").catch(() => undefined);
  };

  const relogin = async () => {
    if (!inTauri) return;
    setBusy(true);
    try {
      const ok = await invoke<boolean>("steam_auto_login", {
        accountIndex: null,
        force: true,
      });
      if (ok) {
        // Verify the session is actually valid after login.
        const info = await tryInvoke<SteamAccountInfo | null>(
          "steam_current_account",
          undefined,
          null,
        );
        if (!info) {
          pushToast(
            t("messages.error") || "Login failed — session invalid",
            "error",
          );
          return;
        }
        await invoke<number>("steam_sync_cookies").catch(() => 0);
        pushToast(
          t("messages.signed_in_to_steam") || "Signed in to Steam",
          "success",
        );
        const list = await tryInvoke<
          { index: number; username: string; is_custom: boolean }[]
        >("accounts_list", undefined, []);
        if (list) setAccounts(list);
        await refreshSession();
      } else {
        pushToast(t("messages.error") || "Relogin failed", "error");
      }
    } catch {
      pushToast(t("messages.error") || "Relogin failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const loggedIn = sessionPhase === "logged-in" && account;
  const displayName =
    account?.persona_name?.trim() || account?.account_name?.trim() || "";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3">
      <div className="flex items-center justify-between gap-3">
        {loggedIn ? (
          <div className="flex items-center gap-2.5 text-sm">
            {account.avatar_url && (
              <img
                src={account.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <span className="font-medium">{displayName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[11px]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger" />
            <span className="truncate text-danger">
              {t("settings.not_signed_in") || "Not signed in"}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          {/* Login / Relogin — silent background auto-login */}
          <button
            className="btn-outline inline-flex items-center gap-1.5"
            onClick={relogin}
            disabled={busy || !inTauri}
          >
            {busy && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
            )}
            {busy
              ? `${t("settings.relogin") || "Relogin"}…`
              : t("settings.relogin") || "Relogin"}
          </button>
          {/* Open Parser — always opens the parser window without touching the session */}
          <button
            className="btn-outline"
            onClick={openParser}
            disabled={!inTauri}
          >
            {t("settings.open_parser") || "Open Parser"}
          </button>
          <button
            className="btn-outline"
            onClick={onOpenParser}
            disabled={!inTauri}
          >
            {t("settings.parser_logs") || "Parser Logs"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomAccountsSection() {
  const { t } = useTranslation();
  const { confirm: showConfirm, ConfirmDialog } = useConfirm();
  const setAccounts = useAppStore((s) => s.setAccounts);
  const [list, setList] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    if (!inTauri) return;
    const custom = await tryInvoke<string[]>(
      "accounts_list_custom",
      undefined,
      [],
    );
    setList(custom ?? []);
    const all = await tryInvoke<
      { index: number; username: string; is_custom: boolean }[]
    >("accounts_list", undefined, []);
    if (all) setAccounts(all);
  }, [setAccounts]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const add = async () => {
    if (!inTauri) return;
    if (!username.trim() || !password) {
      pushToast(t("messages.invalid_input"), "error");
      return;
    }
    setBusy(true);
    try {
      const ok = await tryInvokeOk("accounts_set_custom", {
        username: username.trim(),
        password,
      });
      if (ok) {
        pushToast(t("settings.account_added") || "Account added", "success");
        setUsername("");
        setPassword("");
        await refreshAccounts();
      } else {
        pushToast(
          t("settings.account_exists") || "Account already exists",
          "error",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: string) => {
    if (!inTauri) return;
    const confirmed = await showConfirm({
      title: t("labels.remove_account") || "Remove Account",
      message:
        t("settings.confirm_remove_account") ||
        t("labels.remove_account_question", { user: u }),
      confirmLabel: t("buttons.remove") || "Remove",
      cancelLabel: t("buttons.cancel") || "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    const ok = await tryInvokeOk("accounts_remove_custom", { username: u });
    if (ok) {
      pushToast(t("messages.removed"), "success");
      await refreshAccounts();
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">
        {t("settings.custom_accounts") || "Custom accounts"}
      </p>
      <p className="text-xs text-muted">
        {t("settings.custom_accounts_description") ||
          "Encrypted on disk with a machine-bound key."}
      </p>
      <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {t("settings.steam_guard_warning") || "Steam Guard must be disabled"}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label
            htmlFor="custom-username"
            className="block text-xs text-subtle mb-1"
          >
            {t("settings.username") || "Username"}
          </label>
          <input
            id="custom-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label
            htmlFor="custom-password"
            className="block text-xs text-subtle mb-1"
          >
            {t("settings.password") || "Password"}
          </label>
          <input
            id="custom-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={add}
          disabled={busy || !inTauri}
        >
          {t("settings.add_account_button") || "Add"}
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-xs text-muted italic">
          {t("settings.no_custom_accounts") || "No custom accounts yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
          {list.map((u) => (
            <li key={u} className="flex items-center gap-3 p-2.5 text-sm">
              <span className="flex-1">{u}</span>
              <button
                className="btn-ghost text-error"
                onClick={() => remove(u)}
                title={t("settings.remove_account") || "Remove account"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {ConfirmDialog}
    </div>
  );
}
