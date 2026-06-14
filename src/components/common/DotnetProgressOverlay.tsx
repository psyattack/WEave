import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDotnetStore } from "@/stores/dotnet";

const DOTNET_READY_KEY = "weave.dotnet.ready";

export default function DotnetProgressOverlay() {
  const status = useDotnetStore((s) => s.status);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!status) {
      return;
    }

    // Show overlay immediately for checking, downloading, and extracting phases
    if (
      status.phase === "checking" ||
      status.phase === "downloading" ||
      status.phase === "extracting"
    ) {
      setVisible(true);
    } else if (status.phase === "ready") {
      // Mark as ready in localStorage so we know it was successful
      localStorage.setItem(DOTNET_READY_KEY, "true");
      // Hide after a short delay when ready
      const timer = setTimeout(() => {
        setVisible(false);
        // Clear status after hiding to prevent re-showing on next init
        useDotnetStore.getState().setStatus(null);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status.phase === "error") {
      setVisible(true);
      // Don't mark as ready on error, so we try again next time
      // Hide after showing error briefly
      const timer = setTimeout(() => {
        setVisible(false);
        // Clear status after hiding
        useDotnetStore.getState().setStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <AnimatePresence>
      {visible && status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-md flex-col items-center gap-6 px-6">
            {/* Spinner */}
            <motion.div
              className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />

            {/* Status message */}
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {getPhaseTitle(status.phase)}
              </h2>
              <p className="mt-2 text-sm text-muted">{status.message}</p>
            </div>

            {/* Progress bar */}
            {status.progress !== null && (
              <div className="w-full">
                <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${status.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted">
                  {Math.round(status.progress)}%
                </p>
              </div>
            )}

            {status.phase === "error" && (
              <p className="text-sm text-red-500">
                Failed to install .NET Runtime. Please check logs.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getPhaseTitle(phase: string): string {
  switch (phase) {
    case "checking":
      return "Checking .NET Runtime";
    case "downloading":
      return "Downloading .NET Runtime";
    case "extracting":
      return "Installing .NET Runtime";
    case "ready":
      return ".NET Runtime Ready";
    case "error":
      return "Installation Error";
    default:
      return "Processing...";
  }
}
