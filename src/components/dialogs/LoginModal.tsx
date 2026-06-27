import { useState, useEffect, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, User, KeyRound } from "lucide-react";
import { useTranslation } from "@/i18n/hooks";
import { invoke, tryInvoke, tryInvokeAction } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { useSteamSessionStore, SteamAccountInfo } from "@/stores/steam-session";
import { useAppStore } from "@/stores/app";
import { triggerGlobalRefresh } from "@/stores/refresh";

export default function LoginModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrSession, setQrSession] = useState<{
    clientId: string;
    requestId: string;
    createdAt: number;
  } | null>(null);
  const [isPrepared, setIsPrepared] = useState(false);

  const setShowLoginPromptOnFail = useAppStore(
    (s) => s.setShowLoginPromptOnFail,
  );
  const loginModalMode = useAppStore((s) => s.loginModalMode);
  const setAccounts = useAppStore((s) => s.setAccounts);
  const setSessionLoggedIn = useSteamSessionStore((s) => s.setLoggedIn);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("credentials");
      setUsername("");
      setPassword("");
      setCode("");
      setBusy(false);
      setErrorMsg(null);
      setShowCodeInput(false);
      setQrCode(null);
      setQrSession(null);
      setIsPrepared(false);
    } else {
      setIsPrepared(false);
      setQrSession(null);
    }
  }

  // Reset state when opened
  useEffect(() => {
    if (!open) return;

    tryInvoke("steam_login_prepare").then(() => {
      setIsPrepared(true);
    });

    // Init QR Session
    tryInvoke<{
      client_id: string;
      challenge_url: string;
      request_id: string;
    }>("steam_qr_begin").then((res) => {
      if (res) {
        setQrSession({
          clientId: res.client_id,
          requestId: res.request_id,
          createdAt: Date.now(),
        });
        setQrCode(
          "https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=" +
            encodeURIComponent(res.challenge_url),
        );
      }
    });
  }, [open]);

  const refreshSession = useCallback(async () => {
    const v = await tryInvoke<boolean>("steam_is_logged_in", undefined, false);
    if (!v) {
      await tryInvoke("steam_current_account", undefined);
      setSessionLoggedIn(null);
      return;
    }
    const info = await tryInvoke<SteamAccountInfo | null>(
      "steam_current_account",
      undefined,
      null,
    );
    setSessionLoggedIn(info ?? null);
  }, [setSessionLoggedIn]);

  const finalizeLogin = useCallback(async () => {
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
    onOpenChange(false);
  }, [refreshSession, setAccounts, onOpenChange, t]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (open && isPrepared) {
      interval = setInterval(async () => {
        const isLoggedIn = await tryInvoke<boolean>(
          "steam_is_logged_in",
          undefined,
          false,
        );
        if (isLoggedIn) {
          clearInterval(interval);
          await finalizeLogin();
          return;
        }

        if (step === "credentials" && qrSession) {
          if (Date.now() - qrSession.createdAt > 25000) {
            tryInvoke<{
              client_id: string;
              challenge_url: string;
              request_id: string;
            }>("steam_qr_begin").then((res) => {
              if (res) {
                setQrSession({
                  clientId: res.client_id,
                  requestId: res.request_id,
                  createdAt: Date.now(),
                });
                setQrCode(
                  "https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=" +
                    encodeURIComponent(res.challenge_url),
                );
              }
            });
            return;
          }

          const res = await tryInvoke<any>("steam_qr_poll", {
            clientId: qrSession.clientId,
            requestId: qrSession.requestId,
          });
          if (res && res.response) {
            if (res.response.refresh_token && res.response.access_token) {
              clearInterval(interval);
              setBusy(true);
              try {
                await tryInvoke("steam_qr_login_finalize", {
                  accessToken: res.response.access_token,
                  refreshToken: res.response.refresh_token,
                });
                await finalizeLogin();
              } catch (e: any) {
                setErrorMsg(String(e));
                setBusy(false);
                busyRef.current = false;
              }
            }
          }
        }

        if (busyRef.current) {
          const err = await tryInvoke<string | null>(
            "steam_login_poll_error",
            undefined,
            null,
          );
          if (err && err.length > 20) {
            setErrorMsg(err);
            setBusy(false);
            busyRef.current = false;
          }
        }
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [open, step, qrSession, isPrepared, finalizeLogin]);

  const handleSystemRelogin = async () => {
    setBusy(true);
    busyRef.current = true;
    try {
      const res = await tryInvokeAction<boolean>("steam_auto_login", {
        accountIndex: null,
        force: true,
      });
      if (res.ok && res.value) {
        const list = await tryInvoke<
          { index: number; username: string; is_custom: boolean }[]
        >("accounts_list", undefined, []);
        if (list) setAccounts(list);
        await refreshSession();
        triggerGlobalRefresh();
        onOpenChange(false);
      } else {
        const error = !res.ok ? res.error : "Unknown error";
        pushToast(`${t("messages.error") || "Relogin failed"}: ${error}`, "error");
      }
    } finally {
      if (open) {
        setBusy(false);
        busyRef.current = false;
      }
    }
  };

  const waitForLoginResult = async (maxAttempts = 15) => {
    for (let i = 0; i < maxAttempts; i++) {
      if (!busyRef.current) return "ERROR";
      await new Promise((r) => setTimeout(r, 1000));
      if (!busyRef.current) return "ERROR";
      const isLoggedIn = await tryInvoke<boolean>(
        "steam_is_logged_in",
        undefined,
        false,
      );
      if (isLoggedIn) {
        return "SUCCESS";
      }
      // If we are at step credentials, check if we need 2FA (heuristically, if it doesn't log in after ~6-8 seconds, it might be 2FA, but we'll wait out a bit)
      if (step === "credentials" && i === 7) {
        return "NEEDS_2FA";
      }
    }
    return "FAILED";
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setErrorMsg(null);
    setBusy(true);
    busyRef.current = true;
    try {
      await invoke("steam_login_fill", { username, password });
      // Polling for success or 2fa
      const result = await waitForLoginResult(10);
      if (result === "SUCCESS") {
        await finalizeLogin();
      } else if (result === "NEEDS_2FA") {
        setStep("2fa");
      } else if (result === "ERROR") {
        // do nothing, errorMsg is set
      } else {
        setErrorMsg(t("messages.error") || "Login failed or timed out");
      }
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if code is empty but user just confirmed on phone, they still submit. So code isn't strictly required if they approve on phone. But we can require it or let them submit empty.
    setErrorMsg(null);
    setBusy(true);
    busyRef.current = true;
    try {
      if (code) {
        await invoke("steam_login_fill_2fa", { code });
      }
      const result = await waitForLoginResult(15);
      if (result === "SUCCESS") {
        await finalizeLogin();
      } else if (result === "ERROR") {
        // do nothing
      } else {
        setErrorMsg(t("messages.error") || "2FA failed or timed out");
      }
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-[50%] left-[50%] z-50 grid w-full max-w-sm translate-[-50%] gap-4 overflow-hidden border border-border bg-surface shadow-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] data-[state=open]:zoom-in-95 sm:rounded-xl">
          <div className="flex flex-col space-y-1.5 p-6 pb-4">
            <Dialog.Title className="flex items-center gap-2 text-xl leading-none font-semibold tracking-tight">
              <Lock className="size-5 text-primary" />
              {t("settings.login_title") || "Steam Login"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted">
              {step === "credentials"
                ? t("settings.login_description") ||
                  "Enter your Steam account credentials to log in to the parser without opening the browser window."
                : t("settings.login_2fa_description") ||
                  "Enter your Steam Guard code or confirm the login on your mobile device."}
            </Dialog.Description>
          </div>

          <div className="px-6 pb-6">
            {!isPrepared ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <span className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted">
                  {t("labels.loading_dots") || "Loading..."}
                </span>
              </div>
            ) : step === "credentials" ? (
              <div className="flex flex-col gap-6">
                {errorMsg && (
                  <div className="mb-0 flex items-center gap-3 rounded-lg bg-red-500/10 p-3 text-red-500">
                    <p className="text-xs">{errorMsg}</p>
                  </div>
                )}
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User className="absolute top-2.5 left-3 size-4 text-muted" />
                      <input
                        autoFocus
                        className="input w-full pl-9"
                        placeholder={t("settings.username") || "Username"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute top-2.5 left-3 size-4 text-muted" />
                      <input
                        type="password"
                        className="input w-full pl-9"
                        placeholder={t("settings.password") || "Password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 pt-4">
                    <button
                      type="button"
                      className="btn-secondary px-3 text-xs"
                      onClick={handleSystemRelogin}
                      disabled={busy}
                    >
                      {busy && (
                        <span className="mr-1 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      )}
                      {t("settings.relogin") || "Relogin to system account"}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={busy}
                      >
                        {t("buttons.cancel") || "Cancel"}
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex items-center gap-2"
                        disabled={busy || !username || !password}
                      >
                        {busy && (
                          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                        {t("settings.login_button") || "Login"}
                      </button>
                    </div>
                  </div>
                  {loginModalMode === "auto" && (
                    <div className="mt-5 mb-1 flex justify-center">
                      <button
                        type="button"
                        className="text-[11px] font-medium tracking-wide text-muted uppercase opacity-60 transition-colors hover:text-primary hover:opacity-100"
                        onClick={() => {
                          setShowLoginPromptOnFail(false);
                          onOpenChange(false);
                        }}
                        disabled={busy}
                      >
                        {t("settings.continue_offline") ||
                          "Continue without account (Do not ask again)"}
                      </button>
                    </div>
                  )}
                </form>
                {qrCode && (
                  <>
                    <div className="h-px w-full bg-border" />
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-xl bg-white p-2.5 shadow-sm">
                        <img
                          src={qrCode}
                          alt="Steam QR Login"
                          className="size-40 object-contain"
                        />
                      </div>
                      <span className="max-w-50 text-center text-xs font-medium text-muted">
                        {t("settings.steam_qr_help") ||
                          "Use the Steam Mobile App to sign in via QR code"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {errorMsg && (
                  <div className="mb-0 flex items-center gap-3 rounded-lg bg-red-500/10 p-3 text-red-500">
                    <p className="text-xs">{errorMsg}</p>
                  </div>
                )}

                {!showCodeInput ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-6">
                    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4 text-primary">
                      <span className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-center text-sm font-medium">
                        {t("settings.steam_guard_help") ||
                          "Ожидание подтверждения в мобильном приложении Steam..."}
                      </span>
                    </div>

                    <div className="mt-2 flex w-full flex-col gap-2">
                      <button
                        type="button"
                        className="btn-secondary w-full py-2 text-sm"
                        onClick={async () => {
                          setShowCodeInput(true);
                          await tryInvoke("steam_login_switch_to_code").catch(
                            () => {},
                          );
                        }}
                        disabled={busy}
                      >
                        Войти с помощью кода
                      </button>

                      <button
                        type="button"
                        className="btn-ghost w-full py-2 text-sm"
                        onClick={() => setStep("credentials")}
                        disabled={busy}
                      >
                        {t("buttons.cancel") || "Отмена"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handle2FASubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium tracking-wide text-subtle uppercase">
                        {t("settings.steam_guard_code") || "Steam Guard Code"}
                      </label>
                      <input
                        autoFocus
                        className="input w-full text-center font-mono text-lg tracking-widest"
                        placeholder="XXXXX"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        disabled={busy}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setShowCodeInput(false)}
                        disabled={busy}
                      >
                        {t("buttons.back") || "Back"}
                      </button>
                      <button
                        type="submit"
                        className="btn-primary flex items-center gap-2"
                        disabled={busy || !code}
                      >
                        {busy && (
                          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                        {t("buttons.submit") || "Submit"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
