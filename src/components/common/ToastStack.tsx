import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { ToastKind, useToastStore } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<ToastKind, string> = {
  info: "bg-background/50 border-info/40 text-info",
  success: "bg-background/50 border-success/40 text-success",
  warning: "bg-background/50 border-warning/40 text-warning",
  error: "bg-background/50 border-danger/40 text-danger",
};

export default function ToastStack() {
  const { toasts, dismiss } = useToastStore();
  const paginationWidth = useAppStore((s) => s.paginationWidth);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pagination right edge: windowWidth / 2 + paginationWidth / 2
  // Toast left edge: windowWidth - 320 - 16
  // Overlap + safe buffer (about ~128px extra gap):
  const isOverlapping = windowWidth < paginationWidth + 770;

  return (
    <div 
      className={cn(
        "pointer-events-none fixed right-4 z-9999 flex w-[320px] max-w-[calc(100vw-32px)] gap-2 transition-all duration-300",
        isOverlapping 
          ? "top-40 flex-col bottom-auto" 
          : "bottom-4 flex-col-reverse top-auto"
      )}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-md border backdrop-blur-2xl px-3 py-2.5 shadow-2xl ${COLORS[toast.kind]}`}
              onClick={() => dismiss(toast.id)}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 text-sm text-foreground">
                {toast.message}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
