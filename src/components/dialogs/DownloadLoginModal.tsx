import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, User, KeyRound } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "@/i18n/hooks";
import { inTauri, invoke, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";

/**
 * Login modal for *download* accounts.
 *
 * Visually this mirrors {@link LoginModal} (Steam web session), but the logic is
 * completely different: it drives the DepotDownloader-based custom account flow
 * (`accounts_verify_custom` / `accounts_set_custom`) and relies on the
 * `auth://*` events instead of the `steam_login_*` web session commands. The
 * Steam Guard / 2FA step is handled by the global Download2FAModal. The two
 * modals are intentionally only similar in appearance.
 *
 * QR login lives outside this modal (the dedicated QR button + DownloadQRModal)
 * because the QR and credential flows spawn separate DepotDownloader processes
 * that must not run at the same time.
 */
export default function DownloadLoginModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const setAccounts = useAppStore((s) => s.setAccounts);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keep the latest credentials reachable from inside the event listeners
  // (which are registered once per open and would otherwise capture stale
  // state values).
  const usernameRef = useRef("");
  const passwordRef = useRef("");
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);
  useEffect(() => {
    passwordRef.current = password;
  }, [password]);

  const refreshAccounts = async () => {
    const list = await tryInvoke<
      { index: number; username: string; is_custom: boolean }[]
    >("accounts_list", undefined, []);
    if (list) setAccounts(list);
  };

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUsername("");
      setPassword("");
      setBusy(false);
      setErrorMsg(null);
    }
  }

  // Register the auth:// event listeners while the modal is open. Closing the
  // modal tears them down AND kills any background DepotDownloader login process
  // so it stops running / logging once the window is gone.
  useEffect(() => {
    if (!open) return;
    if (!inTauri) return;

    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      const registered = [
        await listen<string>("auth://success", async (ev) => {
          if (ev.payload !== usernameRef.current.trim()) return;
          const ok = await tryInvokeOk("accounts_set_custom", {
            username: usernameRef.current.trim(),
            password: passwordRef.current,
          });
          if (ok) {
            pushToast(t("settings.account_added") || "Account added", "success");
            await refreshAccounts();
            onSuccess?.();
            onOpenChange(false);
          } else {
            setErrorMsg(
              t("settings.account_exists") || "Account already exists",
            );
            setBusy(false);
          }
        }),
        await listen<string>("auth://failed", (ev) => {
          if (ev.payload !== usernameRef.current.trim()) return;
          setErrorMsg(
            t("messages.error") ||
              "Authentication failed. Check your credentials.",
          );
          setBusy(false);
        }),
        await listen<string>("auth://require_app_confirm", (ev) => {
          if (ev.payload !== usernameRef.current.trim()) return;
          pushToast("Please approve the login in your Steam Mobile App.", "info");
        }),
        await listen<string>("auth://done", (ev) => {
          if (ev.payload !== usernameRef.current.trim()) return;
          setBusy(false);
        }),
      ];

      if (cancelled) {
        registered.forEach((u) => u());
        return;
      }
      unlisteners.push(...registered);
    };

    void setup();

    return () => {
      cancelled = true;
      unlisteners.forEach((u) => u());
      // Kill any in-flight DepotDownloader login process so it does not keep
      // running / logging in the background after the modal closes.
      void invoke("accounts_cancel_auth").catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inTauri) return;
    if (!username.trim() || !password) {
      setErrorMsg(t("messages.invalid_input") || "Enter a username and password");
      return;
    }

    setErrorMsg(null);
    setBusy(true);
    try {
      // Verification result is delivered asynchronously via the auth:// events
      // (success / failed / require_app_confirm / require_2fa). The global
      // Download2FAModal handles the Steam Guard step when required.
      await tryInvoke("accounts_verify_custom", {
        username: username.trim(),
        password,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(t("messages.error") || "Failed to verify account");
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-surface shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-xl overflow-hidden">
          <div className="flex flex-col space-y-1.5 p-6 pb-4">
            <Dialog.Title className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t("settings.add_custom_account_title") || "Add download account"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted">
              {t("settings.add_custom_account_description") ||
                "Enter the Steam credentials for an account used for downloading."}
            </Dialog.Description>
          </div>

          <div className="px-6 pb-6">
            <div className="flex flex-col gap-6">
              {errorMsg && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 text-red-500 mb-0">
                  <p className="text-xs">{errorMsg}</p>
                </div>
              )}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      autoFocus
                      className="input pl-9 w-full"
                      placeholder={t("settings.username") || "Username"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      type="password"
                      className="input pl-9 w-full"
                      placeholder={t("settings.password") || "Password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="flex justify-end items-center gap-3 pt-4 w-full">
                  {/* Cancel stays enabled during login so the user can always
                      abort (which kills the background DepotDownloader). */}
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("buttons.cancel") || "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-2"
                    disabled={busy || !username.trim() || !password}
                  >
                    {busy && (
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    )}
                    {t("settings.add_account_button") || "Add"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
