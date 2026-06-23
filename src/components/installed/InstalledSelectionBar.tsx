
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import { Check, Package, Trash2, X } from "lucide-react";

interface InstalledSelectionBarProps {
  selectionMode: boolean;
  selectedIds: Set<string>;
  clearSelection: () => void;
  selectAll: () => void;
  handleBulkExtract: () => void;
  handleBulkDelete: () => void;
}

export default function InstalledSelectionBar({
  selectionMode,
  selectedIds,
  clearSelection,
  selectAll,
  handleBulkExtract,
  handleBulkDelete,
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
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-sunken/50 px-3 py-2 border border-border">
            <button
              type="button"
              onClick={clearSelection}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <X className="h-4 w-4" />
              {t("labels.clear_selection")}
            </button>
            <button
              type="button"
              onClick={selectAll}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Check className="h-4 w-4" />
              {t("labels.select_all")}
            </button>
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-sm font-medium"
            >
              {t("labels.selected_count", { count: selectedIds.size })}
            </div>
            {selectedIds.size > 0 && (
              <>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkExtract}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Package className="h-4 w-4" />
                    {t("labels.extract_selected")}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="btn-danger flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("labels.delete_selected")}
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
