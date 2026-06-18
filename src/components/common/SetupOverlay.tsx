import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDotnetStore } from "@/stores/dotnet";

export default function SetupOverlay() {
  const overallProgress = useDotnetStore((s) => s.overallProgress);
  const currentMessage = useDotnetStore((s) => s.currentMessage);
  const currentPhase = useDotnetStore((s) => s.currentPhase);
  const hide = useDotnetStore((s) => s.hide);
  const queue = useDotnetStore((s) => s.queue);
  const [showOverlay, setShowOverlay] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if any operation is active
  const hasActive = queue.some(
    (e) => e.phase !== "ready" && e.phase !== "error",
  );
  const hasErrors = queue.some((e) => e.phase === "error");
  const allDone = queue.length > 0 && !hasActive;

  // Show overlay when there's activity
  useEffect(() => {
    if (hasActive) {
      setShowOverlay(true);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    } else if (allDone) {
      // Hide after a delay when everything is done
      hideTimer.current = setTimeout(
        () => {
          hide();
          setShowOverlay(false);
        },
        hasErrors ? 3000 : 1000,
      );
    }
  }, [hasActive, allDone, hasErrors, hide]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!showOverlay || queue.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {showOverlay && (
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
                {getPhaseTitle(currentPhase)}
              </h2>
              <p className="mt-2 text-sm text-muted">{currentMessage}</p>
            </div>

            {/* Single progress bar */}
            <div className="w-full">
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-muted">
                {Math.round(overallProgress)}%
              </p>
            </div>

            {hasErrors && (
              <p className="text-sm text-red-500">
                Some installations failed. Please check logs.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getPhaseTitle(phase: string | null): string {
  switch (phase) {
    case "checking":
      return "Checking...";
    case "downloading":
      return "Downloading...";
    case "extracting":
      return "Installing...";
    case "ready":
      return "Ready";
    case "error":
      return "Installation Error";
    default:
      return "Preparing...";
  }
}
