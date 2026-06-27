import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  asideContent?: ReactNode;
  side?: "right" | "left";
  width?: string;
  preventClose?: boolean;
  onPreventedClose?: () => void;
}

export default function Drawer({
  open,
  onOpenChange,
  title,
  children,
  asideContent,
  side = "right",
  width = "420px",
  preventClose = false,
  onPreventedClose,
}: DrawerProps) {
  const isRight = side === "right";
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content 
              asChild
              onInteractOutside={(e) => {
                if (preventClose) {
                  e.preventDefault();
                  onPreventedClose?.();
                }
              }}
              onEscapeKeyDown={(e) => {
                if (preventClose) {
                  e.preventDefault();
                  onPreventedClose?.();
                }
              }}
            >
              <motion.aside
                initial={{ x: isRight ? "100%" : "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: isRight ? "100%" : "-100%" }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 36,
                }}
                style={{ width }}
                className={cn(
                  "fixed top-0 z-50 flex h-full flex-col border-white/10 bg-background/50 shadow-2xl backdrop-blur-3xl",
                  isRight ? "right-0 border-l" : "left-0 border-r",
                )}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                  <RadixDialog.Title className="text-sm font-semibold">
                    {title}
                  </RadixDialog.Title>
                  <RadixDialog.Description className="sr-only">
                    Details
                  </RadixDialog.Description>
                </div>
                <div className="drawer-scroll flex-1 overflow-auto">
                  {children}
                </div>
                {asideContent}
              </motion.aside>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
