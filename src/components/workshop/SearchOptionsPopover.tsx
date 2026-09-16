import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Tooltip } from "@/components/common/Tooltip";
import { useTranslation } from "@/i18n/hooks";
import { cn } from "@/lib/utils";
import { useFiltersStore } from "@/stores/filters";

const SEARCH_MODES = [
  { value: 0, labelKey: "filters.search_fields.title_and_description" },
  { value: 1, labelKey: "filters.search_fields.title_only" },
  { value: 2, labelKey: "filters.search_fields.description_only" },
] as const;

export default function SearchOptionsPopover() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchMode = useFiltersStore((s) => s.filters.search_text_mode ?? 0);
  const setFilters = useFiltersStore((s) => s.setFilters);

  const isRu = i18n.language?.startsWith("ru");

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip content={t("filters.search_options") || "Search Options"}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "flex size-6.5 cursor-pointer items-center justify-center rounded text-subtle transition-colors outline-none hover:bg-surface-raised/80 hover:text-foreground focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
            open && "bg-surface-raised text-foreground",
            searchMode > 0 && "text-primary hover:text-primary",
          )}
          aria-label={t("filters.search_options") || "Search Options"}
          aria-expanded={open}
        >
          <Settings className="size-3.5" />
        </button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full -right-1.25 z-50 mt-2.5 w-90 max-w-[calc(100vw-32px)] rounded-lg border border-border/80 bg-surface-raised/80 p-4 text-xs shadow-2xl backdrop-blur-2xl sm:w-105"
          >
            {/* Field Selection Title */}
            <div className="mb-3 text-[13px] font-medium text-foreground">
              {t("filters.search_fields.title")}
            </div>

            {/* Radio Group */}
            <div className="mb-4 flex flex-col gap-2.5">
              {SEARCH_MODES.map((mode) => {
                const isSelected = searchMode === mode.value;
                return (
                  <button
                    type="button"
                    key={mode.value}
                    onClick={() => {
                      setFilters({ search_text_mode: mode.value, page: 1 });
                    }}
                    className="group flex cursor-pointer items-center gap-2.5 text-left"
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-border/80 bg-surface-raised group-hover:border-primary/60",
                      )}
                    >
                      {isSelected && (
                        <div className="size-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs transition-colors select-none",
                        isSelected
                          ? "font-medium text-foreground"
                          : "text-subtle group-hover:text-foreground",
                      )}
                    >
                      {t(mode.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Syntax Help */}
            <div className="flex flex-col gap-2.5 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-subtle">
              <p>
                {isRu ? (
                  <>
                    Вы можете создавать более сложные поисковые запросы,
                    используя операторы{" "}
                    <span className="font-semibold text-foreground">AND</span>,{" "}
                    <span className="font-semibold text-foreground">OR</span> и{" "}
                    <span className="font-semibold text-foreground">NOT</span>{" "}
                    (используйте прописные буквы). Вы также можете использовать
                    символы{" "}
                    <span className="font-semibold text-foreground">+</span> и{" "}
                    <span className="font-semibold text-foreground">-</span> в
                    качестве сокращённых вариантов для{" "}
                    <span className="font-semibold text-foreground">AND</span> и{" "}
                    <span className="font-semibold text-foreground">NOT</span>.
                  </>
                ) : (
                  <>
                    You can create more complex search queries using the
                    operators{" "}
                    <span className="font-semibold text-foreground">AND</span>,{" "}
                    <span className="font-semibold text-foreground">OR</span>{" "}
                    and{" "}
                    <span className="font-semibold text-foreground">NOT</span>{" "}
                    (use uppercase letters). You can also use the{" "}
                    <span className="font-semibold text-foreground">+</span> and{" "}
                    <span className="font-semibold text-foreground">-</span>{" "}
                    characters as shorthand for{" "}
                    <span className="font-semibold text-foreground">AND</span>{" "}
                    and{" "}
                    <span className="font-semibold text-foreground">NOT</span>.
                  </>
                )}
              </p>

              <ul className="flex flex-col gap-1.5 pl-3 text-muted">
                <li className="flex items-start gap-1.5">
                  <span className="text-subtle">•</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {isRu ? "красный AND синий" : "red AND blue"}
                    </span>{" "}
                    {t("filters.search_fields.help_example_and")}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-subtle">•</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {isRu ? "красный OR синий" : "red OR blue"}
                    </span>{" "}
                    {t("filters.search_fields.help_example_or")}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-subtle">•</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {isRu ? "красный -синий" : "red -blue"}
                    </span>{" "}
                    {t("filters.search_fields.help_example_not")}
                  </span>
                </li>
              </ul>

              <p>{t("filters.search_fields.grouping_text")}</p>

              <ul className="flex flex-col gap-1.5 pl-3 text-muted">
                <li className="flex items-start gap-1.5">
                  <span className="text-subtle">•</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {isRu
                        ? "(красный OR синий) AND комната"
                        : "(red OR blue) AND room"}
                    </span>{" "}
                    {t("filters.search_fields.grouping_example_1")}
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-subtle">•</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {isRu
                        ? "(красный OR синий) AND комната -зелёный"
                        : "(red OR blue) AND room -green"}
                    </span>{" "}
                    {t("filters.search_fields.grouping_example_2")}
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
