import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import { Check, Package, Trash2, X, Copy } from "lucide-react";

interface InstalledSelectionBarProps {
  selectionMode: boolean;
  selectedIds: Set<string>;
  clearSelection: () => void;
  selectAll: () => void;
  handleBulkExtract: () => void;
  handleBulkDelete: () => void;
  handleBulkCopyId: () => void;
}

export default function InstalledSelectionBar({
  selectionMode,
  selectedIds,
  clearSelection,
  selectAll,
  handleBulkExtract,
  handleBulkDelete,
  handleBulkCopyId,
}: InstalledSelectionBarProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {selectionMode && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="px-4 pb-1.5"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface-sunken/50 px-3 py-2">
            <button
              type="button"
              onClick={clearSelection}
              className="btn btn-ghost flex items-center gap-2 text-sm"
            >
              <X className="size-4" />
              {t("labels.clear_selection")}
            </button>
            
            <div className="h-4 w-px bg-white/10" />

            <button
              type="button"
              onClick={selectAll}
              className="btn btn-ghost flex items-center gap-2 text-sm"
            >
              <Check className="size-4" />
              {t("labels.select_all")}
            </button>
            
            <div className="h-4 w-px bg-white/10" />

            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-sm font-medium"
            >
              {t("labels.selected_count", { count: selectedIds.size })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkExtract}
                    className="btn flex items-center gap-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Package className="size-4" />
                    {t("labels.extract_selected")}
                  </button>

                  <div className="h-4 w-px bg-white/10" />

                  <button
                    type="button"
                    onClick={handleBulkCopyId}
                    className="btn btn-ghost flex items-center gap-2 text-sm"
                  >
                    <Copy className="size-4" />
                    {t("buttons.copy_id") || "Copy ID"}
                  </button>

                  <div className="h-4 w-px bg-white/10" />

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="btn flex items-center gap-2 text-sm text-danger transition-colors hover:bg-danger hover:text-white"
                  >
                    <Trash2 className="size-4" />
                    {t("labels.delete_selected")}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
