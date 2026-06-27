import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { QrCode, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@/lib/tauri";
import { useTranslation } from "@/i18n/hooks";
import { useAppStore } from "@/stores/app";
import { pushToast } from "@/stores/toasts";

export function DownloadQRModal({
  open,
  onOpenChange,
  qrData,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: string;
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();
  const setAccounts = useAppStore((s) => s.setAccounts);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let unlistenFailed: (() => void) | undefined;
    let unlistenSuccess: (() => void) | undefined;

    const setup = async () => {
      const u1 = await listen<string>("auth://qr_failed", (ev) => {
        pushToast(`${t("messages.error") || "QR Authentication Failed"}: ${ev.payload}`, "error");
        onOpenChange(false);
      });
      unlistenFailed = u1;

      const u2 = await listen<string>("auth://qr_success", async (ev) => {
        setBusy(true);
        const username = ev.payload;
        pushToast(`Authenticated as ${username}`, "success");
        // Add to local accounts with dummy password
        await invoke("accounts_set_custom", {
          username,
          password: "",
        }).catch(() => undefined);
        const list = await invoke<
          { index: number; username: string; is_custom: boolean }[]
        >("accounts_list").catch(() => []);
        setAccounts(list);
        setBusy(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      });
      unlistenSuccess = u2;
    };
    void setup();

    return () => {
      if (unlistenFailed) unlistenFailed();
      if (unlistenSuccess) unlistenSuccess();
    };
  }, [open, onOpenChange, t, setAccounts, onSuccess]);

  const handleCancel = async () => {
    if (busy) return;
    await invoke("accounts_cancel_qr").catch(() => undefined);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => { if (!busy && !val) handleCancel(); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm transition-opacity" />
            <div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center p-4">
              <Dialog.Content
                asChild
                onInteractOutside={(e) => {
                  e.preventDefault();
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl"
                >
                  <button
                    onClick={handleCancel}
                    disabled={busy}
                    className="absolute top-4 right-4 rounded-full p-1 opacity-70 transition-all hover:bg-white/10 hover:opacity-100 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <X className="size-4" />
                  </button>
                  <div className="p-6">
                    <div className="mb-6 flex flex-col items-center text-center">
                      <div className="bg-accent/50 text-accent-foreground mb-4 flex size-12 items-center justify-center rounded-full ring-4 ring-background">
                        <QrCode className="size-6" />
                      </div>
                      <Dialog.Title className="mb-1 text-lg font-semibold tracking-tight">
                        {t("settings.login_qr") || "Login with QR"}
                      </Dialog.Title>
                      <Dialog.Description className="text-muted-foreground max-w-62.5 text-sm">
                        {t("settings.login_qr_desc") || "Scan this code with your Steam Mobile App to sign in."}
                      </Dialog.Description>
                    </div>

                    <div className="relative mb-6 flex w-full justify-center">
                      <div className="max-w-full overflow-auto rounded-lg bg-white p-3">
                        {qrData ? (
                          <pre
                            className="m-0 font-mono whitespace-pre text-black select-none"
                            style={{
                              fontSize: "7px",
                              // Each dark module is rendered as two characters
                              // wide ("██") but only one line tall, so the line
                              // height is widened to keep the modules square —
                              // letter-spacing MUST stay at 0 or the blocks split
                              // apart and the code becomes unscannable.
                              lineHeight: "8.4px",
                              letterSpacing: "0",
                            }}
                          >
                            {qrData}
                          </pre>
                        ) : (
                          <div className="flex size-40 items-center justify-center text-xs text-gray-500">
                            {t("settings.generating_qr") || "Generating QR code…"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
