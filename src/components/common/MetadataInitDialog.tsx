
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/hooks";
import { useMetadataInitStore } from "@/stores/metadata-init";
import { tryInvoke } from "@/lib/tauri";
import { cn } from "@/lib/utils";

export default function MetadataInitDialog() {
  const { t } = useTranslation();
  const status = useMetadataInitStore((s) => s.status);
  const setStatus = useMetadataInitStore((s) => s.setStatus);

  const isOpen = status !== null;

  if (!status) return null;

  const { phase, message, progress, total } = status;

  const progressPercent =
    progress !== null && total !== null && total > 0
      ? Math.round((progress / total) * 100)
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="metadata-init-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (phase === "complete" || phase === "error") {
              setStatus(null);
            }
          }}
        />
      )}
      {isOpen && (
        <motion.div
          key="metadata-init-dialog-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            key="metadata-init-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-surface-elevated/95 pointer-events-auto relative w-full max-w-md rounded-lg border border-border p-6 shadow-xl backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Icon */}
              <div className="flex size-16 items-center justify-center">
                {phase === "initializing" && (
                  <Loader2 className="size-10 animate-spin text-primary" />
                )}
                {phase === "complete" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="size-10 text-success" />
                  </motion.div>
                )}
                {phase === "error" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <XCircle className="size-10 text-danger" />
                  </motion.div>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold">
                {phase === "initializing" &&
                  (t("metadata_init.initializing") ||
                    "Initializing Metadata")}
                {phase === "complete" &&
                  (t("metadata_init.complete") || "Complete")}
                {phase === "error" && (t("metadata_init.error") || "Error")}
              </h2>

              {/* Message */}
              <p className="text-sm text-muted">{message}</p>

              {/* Progress */}
              {phase === "initializing" &&
                progress !== null &&
                total !== null && (
                  <div className="w-full space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{
                          x: `-${100 - (progressPercent || 0)}%`,
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="size-full bg-primary"
                      />
                    </div>
                    <p className="text-xs text-muted">
                      {progress} / {total} ({progressPercent}%)
                    </p>
                  </div>
                )}

              {/* Cancel Button for initializing */}
              {phase === "initializing" && (
                <button
                  onClick={async () => {
                    await tryInvoke("app_cancel_init_metadata");
                    setStatus({
                      phase: "idle",
                      message: "",
                      progress: null,
                      total: null,
                    });
                  }}
                  className="btn-outline mt-2 border-danger/20 text-danger hover:bg-danger/10"
                >
                  {t("buttons.cancel") || "Cancel"}
                </button>
              )}

              {/* Close Button (only for error/complete) */}
              {(phase === "error" || phase === "complete") && (
                <button
                  onClick={() => setStatus(null)}
                  className={cn(
                    "btn-outline mt-2",
                    phase === "error" && "border-red-500/20 text-red-500",
                  )}
                >
                  {t("buttons.close") || "Close"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
