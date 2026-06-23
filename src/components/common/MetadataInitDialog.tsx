import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/hooks";
import { useMetadataInitStore } from "@/stores/metadata-init";
import { cn } from "@/lib/utils";

export default function MetadataInitDialog() {
  const { t } = useTranslation();
  const status = useMetadataInitStore((s) => s.status);
  const setStatus = useMetadataInitStore((s) => s.setStatus);

  const isOpen = status !== null;

  // Auto-close after 2 seconds on complete
  useEffect(() => {
    if (status?.phase === "complete") {
      const timer = setTimeout(() => {
        setStatus(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status?.phase, setStatus]);

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        >
          <motion.div
            key="metadata-init-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="pointer-events-auto relative w-full max-w-md rounded-lg bg-surface-elevated/95 backdrop-blur-md border border-border p-6 shadow-xl"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center">
                {phase === "initializing" && (
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                )}
                {phase === "complete" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </motion.div>
                )}
                {phase === "error" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <XCircle className="h-12 w-12 text-red-500" />
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

              {/* Progress Bar */}
              {phase === "initializing" &&
                progress !== null &&
                total !== null &&
                total > 0 && (
                  <div className="w-full space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${progressPercent}%`,
                        }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <p className="text-xs text-muted">
                      {progress} / {total} ({progressPercent}%)
                    </p>
                  </div>
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
