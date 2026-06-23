import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound } from "lucide-react";
import { tryInvoke } from "@/lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";

export default function Download2FAModal() {
  const [open, setOpen] = useState(false);
  const [pubfileid, setPubfileid] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    let unlistenDl: (() => void) | undefined;
    let unlistenAuth: (() => void) | undefined;

    listen("download://require_2fa", (e: { payload: unknown }) => {
      setPubfileid(e.payload as string);
      setIsAuth(false);
      setCode("");
      setOpen(true);
    }).then((u: () => void) => {
      unlistenDl = u;
    });

    listen("auth://require_2fa", (e: { payload: unknown }) => {
      setPubfileid(e.payload as string); // It's actually username here
      setIsAuth(true);
      setCode("");
      setOpen(true);
    }).then((u: () => void) => {
      unlistenAuth = u;
    });

    return () => {
      unlistenDl?.();
      unlistenAuth?.();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      if (isAuth) {
        await tryInvoke("accounts_submit_2fa", { username: pubfileid, code: code.trim() });
      } else {
        await tryInvoke("download_submit_2fa", { pubfileid, code: code.trim() });
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(val) => { if (!busy) setOpen(val); }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm transition-opacity" />
            <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                  className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl"
                >
                  <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6 flex flex-col items-center text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/50 text-accent-foreground ring-4 ring-background">
                        <KeyRound className="h-6 w-6" />
                      </div>
                      <Dialog.Title className="mb-1 text-lg font-semibold tracking-tight">
                        Steam Guard 2FA
                      </Dialog.Title>
                      <Dialog.Description className="text-sm text-muted">
                        Enter the code from your Steam Mobile Authenticator or email.
                      </Dialog.Description>
                    </div>

                    <div className="mb-6">
                      <input
                        type="text"
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="XXXXX"
                        className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-center text-lg font-medium tracking-widest placeholder:tracking-normal focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                        disabled={busy}
                        maxLength={10}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="btn-secondary flex-1"
                          disabled={busy}
                        >
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        type="submit"
                        className="btn-primary flex-1"
                        disabled={busy || !code.trim()}
                      >
                        {busy && <span className="inline-block mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                        Submit
                      </button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
