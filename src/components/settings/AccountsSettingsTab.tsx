import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { Trash2, AlertCircle, UserPlus } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

import { inTauri, invoke, tryInvoke, tryInvokeAction } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";
import { useConfirm } from "@/hooks/useConfirm";
import { useSteamSessionStore, SteamAccountInfo } from "@/stores/steam-session";
import { triggerGlobalRefresh } from "@/stores/refresh";
import { LogIn, RefreshCw, QrCode } from "lucide-react";
import { Tooltip } from "@/components/common/Tooltip";

import DownloadLoginModal from "@/components/dialogs/DownloadLoginModal";
import { DownloadQRModal } from "@/components/dialogs/DownloadQRModal";

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
      <DownloadAccountSection />
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
        triggerGlobalRefresh();
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
      const res = await tryInvokeAction<boolean>("steam_auto_login", {
        accountIndex: null,
        force: true,
      });
      if (res.ok && res.value) {
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
        triggerGlobalRefresh();
      } else {
        const err = !res.ok ? res.error : "Unknown error";
        pushToast(`${t("messages.error") || "Relogin failed"}: ${err}`, "error");
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      pushToast(`${t("messages.error") || "Relogin failed"}: ${err}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const loggedIn = sessionPhase === "logged-in" && account;
  const displayName =
    account?.persona_name?.trim() || account?.account_name?.trim() || "";
  const setLoginModalOpen = useAppStore((s) => s.setLoginModalOpen);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3">
      <div className="flex items-center justify-between gap-3">
        {loggedIn ? (
          <div className="flex items-center gap-1 text-sm">
            {account.avatar_url && (
              <img
                src={account.avatar_url}
                alt=""
                className="h-8 w-8 rounded-full object-cover mr-1"
              />
            )}
            <span className="font-medium leading-none">{displayName}</span>
            <Tooltip content={t("settings.relogin") || "Relogin"} side="top">
              <button
                className="btn-ghost p-1.5 h-auto text-muted hover:text-foreground"
                onClick={relogin}
                disabled={busy || !inTauri}
              >
                <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px]">
            <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger" />
              <span className="truncate text-danger">
                {t("settings.not_signed_in") || "Not signed in"}
              </span>
            </div>
            <Tooltip content={t("settings.relogin") || "Relogin"} side="top">
              <button
                className="btn-ghost p-2 h-auto text-muted hover:text-foreground"
                onClick={relogin}
                disabled={busy || !inTauri}
              >
                <RefreshCw className={`w-5 h-5 ${busy ? "animate-spin" : ""}`} />
              </button>
            </Tooltip>
          </div>
        )}
        <div className="flex gap-2">
          {/* New manual login button */}
          <button
            className="btn-outline inline-flex items-center gap-1.5"
            onClick={() => setLoginModalOpen(true, "manual")}
            disabled={!inTauri}
          >
            <LogIn className="w-4 h-4" />
            {t("settings.login_button") || "Login"}
          </button>
          
          {/* Open Parser & Logs — dev build only */}
          {import.meta.env.DEV && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadAccountSection() {
  const { t } = useTranslation();
  const { confirm: showConfirm, ConfirmDialog } = useConfirm();
  const state = useAppStore();
  const setAccounts = useAppStore((s) => s.setAccounts);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // QR login (kept separate from the credential modal because the two flows
  // spawn distinct DepotDownloader processes that must not run concurrently).
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState("");

  const refreshAccounts = useCallback(async () => {
    if (!inTauri) return;
    const all = await tryInvoke<
      { index: number; username: string; is_custom: boolean }[]
    >("accounts_list", undefined, []);
    if (all) setAccounts(all);
  }, [setAccounts]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const startQrLogin = async () => {
    if (!inTauri) {
      pushToast(
        t("messages.error") || "QR login is only available in the desktop app.",
        "error",
      );
      return;
    }
    setBusy(true);
    // Open the modal immediately with a loading state so the click always has a
    // visible effect, even while DepotDownloader starts up and generates the
    // code. qrData is filled in once the "auth://qr_ready" event arrives.
    setQrData("");
    setQrModalOpen(true);

    let unlistenReady: (() => void) | undefined;
    let unlistenDone: (() => void) | undefined;

    const cleanup = () => {
      unlistenReady?.();
      unlistenDone?.();
    };

    try {
      unlistenReady = await listen<string>("auth://qr_ready", (ev) => {
        setQrData(ev.payload);
        setQrModalOpen(true);
        setBusy(false);
      });
      unlistenDone = await listen<string>("auth://done", (ev) => {
        if (ev.payload === "qr") {
          setBusy(false);
          cleanup();
        }
      });

      // Surface backend errors (e.g. DepotDownloader missing, failed to spawn)
      // instead of silently doing nothing.
      try {
        await invoke("accounts_login_qr");
      } catch (err) {
        console.error("accounts_login_qr failed", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        pushToast(
          typeof err === "string"
            ? err
            : `${t("messages.error") || "Could not start QR login"}: ${errorMsg}`,
          "error",
        );
        setBusy(false);
        setQrModalOpen(false);
        cleanup();
      }
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      pushToast(`${t("messages.error") || "Could not start QR login"}: ${errorMsg}`, "error");
      setBusy(false);
      setQrModalOpen(false);
      cleanup();
    }
  };

  const selectAuto = () => {
    state.setAccountIndex(0);
    void persist("settings.account.account.account_number", 0);
  };

  const selectAccount = (index: number) => {
    state.setAccountIndex(index);
    void persist("settings.account.account.account_number", index);
  };

  const remove = async (u: string, index: number) => {
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
    const res = await tryInvokeAction("accounts_remove_custom", { username: u });
    if (res.ok) {
      pushToast(t("messages.removed"), "success");
      // If the removed account was selected, fall back to Auto.
      if (state.accountIndex === index) {
        selectAuto();
      }
      await refreshAccounts();
    } else {
      pushToast(`${t("messages.error") || "Could not remove account"}: ${res.error}`, "error");
    }
  };

  const isAutoSelected =
    state.accounts.find((a) => a.index === state.accountIndex)?.is_custom !==
    true;
  const customAccounts = state.accounts.filter((a) => a.is_custom);

  return (
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
            checked={isAutoSelected}
            onChange={selectAuto}
          />
          <span className="flex-1">{t("settings.auto_account") || "Auto"}</span>
        </label>
        {customAccounts.map((a) => (
          <div
            key={`${a.index}-${a.username}`}
            className="flex items-center gap-3 p-2.5 text-sm"
          >
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="radio"
                name="account"
                checked={state.accountIndex === a.index}
                onChange={() => selectAccount(a.index)}
              />
              <span className="inline-flex items-center gap-2">
                <span>{a.username}</span>
                <span className="chip text-info">
                  {t("settings.custom_badge") || "custom"}
                </span>
              </span>
            </label>
            <button
              className="btn-ghost text-error"
              onClick={() => remove(a.username, a.index)}
              title={t("settings.remove_account") || "Remove account"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>



      <div className="flex items-center gap-2">
        <button
          className="btn-outline inline-flex items-center gap-1.5"
          onClick={() => setModalOpen(true)}
          disabled={!inTauri}
        >
          <UserPlus className="w-4 h-4" />
          {t("settings.add_custom_account") || "Add custom account"}
        </button>
        <Tooltip content={t("settings.login_qr") || "Login with QR"} side="top">
          <button
            className="btn-outline px-3"
            onClick={startQrLogin}
            disabled={busy || !inTauri}
          >
            <QrCode className="h-5 w-4" />
          </button>
        </Tooltip>
      </div>

      <DownloadLoginModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={refreshAccounts}
      />

      <DownloadQRModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        qrData={qrData}
        onSuccess={() => {
          setQrModalOpen(false);
          void refreshAccounts();
        }}
      />
      {ConfirmDialog}
    </div>
  );
}
