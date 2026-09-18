import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CheckSquare,
  Database,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SortAsc,
  X,
} from "lucide-react";
import Select from "@/components/common/Select";
import { Tooltip } from "@/components/common/Tooltip";
import { cn } from "@/lib/utils";
import { inTauri } from "@/lib/tauri";
import { useAppStore } from "@/stores/app";
import {
  LOCAL_SORT_KEYS,
  LOCAL_SORT_OPTIONS,
  translateTagValue,
  type LocalSortKey,
} from "@/lib/filterConfig";

interface InstalledToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  sort: LocalSortKey;
  setSort: (v: LocalSortKey) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (f: (o: "asc" | "desc") => "asc" | "desc") => void;
  category: string;
  setCategory: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  resolution: string;
  setResolution: (v: string) => void;
  selectionMode: boolean;
  setSelectionMode: (f: (o: boolean) => boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: (f: (o: boolean) => boolean) => void;
  tagFilters: string[];
  setTagFilters: (v: string[]) => void;
  excludedTagFilters: string[];
  setExcludedTagFilters: (v: string[]) => void;
  authorFilters: string[];
  setAuthorFilters: (v: string[]) => void;
  excludedAuthorFilters: string[];
  setExcludedAuthorFilters: (v: string[]) => void;
  activeFiltersCount: number;
  handleInitMetadata: () => void;
  toggleTag: (tag: string) => void;
  toggleAuthor: (author: string) => void;
  itemsCount: number;
}

interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export default function InstalledToolbar({
  search,
  setSearch,
  sort,
  setSort,
  sortOrder,
  setSortOrder,
  category,
  setCategory,
  typeFilter,
  setTypeFilter,
  age,
  setAge,
  resolution,
  setResolution,
  selectionMode,
  setSelectionMode,
  showAdvanced,
  setShowAdvanced,
  tagFilters,
  setTagFilters,
  excludedTagFilters,
  setExcludedTagFilters,
  authorFilters,
  setAuthorFilters,
  excludedAuthorFilters,
  setExcludedAuthorFilters,
  activeFiltersCount,
  handleInitMetadata,
  toggleTag,
  toggleAuthor,
  itemsCount,
}: InstalledToolbarProps) {
  const { t, i18n } = useTranslation();
  const showActiveFilters = useAppStore((s) => s.showActiveFilters);

  const sortOptions = LOCAL_SORT_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.local_sort.${k}`, {
      defaultValue: LOCAL_SORT_OPTIONS[k],
    }),
  }));

  const handleClearAll = () => {
    setCategory("");
    setTypeFilter("");
    setAge("");
    setResolution("");
    setTagFilters([]);
    setExcludedTagFilters([]);
    setAuthorFilters([]);
    setExcludedAuthorFilters([]);
  };

  // Construct active chips list for quick display and dismissal
  const activeChips: ActiveChip[] = [];

  if (category) {
    activeChips.push({
      id: "category",
      label: `${t("tag_categories.Category")}: ${translateTagValue(category, "Category", i18n)}`,
      onRemove: () => setCategory(""),
    });
  }

  if (typeFilter) {
    activeChips.push({
      id: "typeFilter",
      label: `${t("tag_categories.Type")}: ${translateTagValue(typeFilter, "Type", i18n)}`,
      onRemove: () => setTypeFilter(""),
    });
  }

  if (resolution) {
    activeChips.push({
      id: "resolution",
      label: `${t("tag_categories.Resolution")}: ${translateTagValue(resolution, "Resolution", i18n)}`,
      onRemove: () => setResolution(""),
    });
  }

  if (age) {
    activeChips.push({
      id: "age",
      label: `${t("tag_categories.Age Rating")}: ${translateTagValue(age, "Age Rating", i18n)}`,
      onRemove: () => setAge(""),
    });
  }

  for (const author of authorFilters) {
    activeChips.push({
      id: `author_inc_${author}`,
      label: `+${author}`,
      onRemove: () => toggleAuthor(author),
    });
  }

  for (const author of excludedAuthorFilters) {
    activeChips.push({
      id: `author_exc_${author}`,
      label: `-${author}`,
      onRemove: () => toggleAuthor(author),
    });
  }

  for (const tag of tagFilters) {
    activeChips.push({
      id: `tag_inc_${tag}`,
      label: `+${translateTagValue(tag, "", i18n)}`,
      onRemove: () => toggleTag(tag),
    });
  }

  for (const tag of excludedTagFilters) {
    activeChips.push({
      id: `tag_exc_${tag}`,
      label: `-${translateTagValue(tag, "", i18n)}`,
      onRemove: () => toggleTag(tag),
    });
  }

  const hasAnyFilters = activeFiltersCount > 0 || activeChips.length > 0;

  return (
    <div className="relative z-30 flex flex-col items-center gap-2 px-4 py-3 pb-1.5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Search Input */}
        <div className="relative w-96">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input px-9 transition-colors hover:border-border-strong focus:border-border-strong focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
            placeholder={t("labels.search_placeholder")}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-subtle transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label={t("common.clear")}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Sort Direction Toggle */}
          <Tooltip
            content={
              sortOrder === "asc"
                ? t("tooltips.sort_asc") || "Ascending"
                : t("tooltips.sort_desc") || "Descending"
            }
            side="bottom"
          >
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              className="relative flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted transition-colors outline-none hover:border-border-strong hover:text-foreground"
              aria-label={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              <motion.span
                key={sortOrder}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.18 }}
                className="inline-flex"
              >
                {sortOrder === "asc" ? (
                  <ArrowUpAZ className="size-4" />
                ) : (
                  <ArrowDownAZ className="size-4" />
                )}
              </motion.span>
            </button>
          </Tooltip>

          {/* Sort Select */}
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as LocalSortKey)}
            options={sortOptions}
            icon={<SortAsc className="size-4 text-muted" />}
          />

          {/* Bulk Selection Toggle */}
          <Tooltip content={t("tooltips.select_multiple")} side="bottom">
            <button
              type="button"
              onClick={() => setSelectionMode((prev) => !prev)}
              className={cn(
                "relative flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted transition-colors outline-none hover:border-border-strong hover:text-foreground",
                selectionMode &&
                  "border-primary/60 bg-primary/10 text-primary hover:border-primary",
              )}
              aria-label={t("tooltips.select_multiple")}
            >
              <CheckSquare className="size-4" />
            </button>
          </Tooltip>

          {/* Init Metadata */}
          <Tooltip
            content={
              t("tooltips.init_metadata") ||
              "Initialize metadata for all installed wallpapers"
            }
            side="bottom"
          >
            <button
              type="button"
              onClick={handleInitMetadata}
              disabled={!inTauri || itemsCount === 0}
              className="relative flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted transition-colors outline-none hover:border-border-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              aria-label={t("settings.initialize_now") || "Initialize metadata"}
            >
              <Database className="size-4" />
            </button>
          </Tooltip>

          {/* Installed Filters Drawer Toggle: Icon only with Tooltip & badge */}
          <Tooltip content={t("filters.workshop_filters") || "Filters"} side="bottom">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-label="Filters"
              className={cn(
                "relative flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted transition-colors outline-none hover:border-border-strong hover:text-foreground focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
                showAdvanced &&
                  "border-primary/60 bg-primary/10 text-primary hover:border-primary",
              )}
            >
              <SlidersHorizontal className="size-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* Reset filters: larger icon appearing only when active filters exist */}
          <AnimatePresence>
            {hasAnyFilters && (
              <Tooltip content={t("filters.reset_all")} side="bottom">
                <motion.button
                  type="button"
                  onClick={handleClearAll}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors outline-none hover:bg-danger/15 hover:text-danger focus:ring-0 focus:outline-none"
                  aria-label={t("filters.reset_all")}
                >
                  <RotateCcw className="size-5" />
                </motion.button>
              </Tooltip>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Filter Pills / Chips */}
      {showActiveFilters && activeChips.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-medium text-subtle">
            {t("filters.active_filters")}:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface-raised px-2 py-0.5 text-xs text-foreground"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="cursor-pointer text-muted transition-colors hover:text-danger"
                aria-label="Remove filter"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="ml-1 cursor-pointer text-[11px] font-medium text-muted underline transition-colors hover:text-danger"
          >
            {t("filters.reset_all")}
          </button>
        </div>
      )}
    </div>
  );
}
