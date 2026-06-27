
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CheckSquare,
  Database,
  Filter,
  Search,
  SortAsc,
  X,
} from "lucide-react";
import Select from "@/components/common/Select";
import { Tooltip } from "@/components/common/Tooltip";
import { cn } from "@/lib/utils";
import { inTauri } from "@/lib/tauri";
import {
  LOCAL_SORT_KEYS,
  LOCAL_SORT_OPTIONS,
  CATEGORY_KEYS,
  CATEGORIES,
  TYPE_KEYS,
  TYPES,
  AGE_RATING_KEYS,
  AGE_RATINGS,
  RESOLUTION_KEYS,
  RESOLUTIONS,
  translateTag,
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
  visibleAuthors: string[];
  visibleMiscTags: string[];
  visibleGenreTags: string[];
  hasActiveFilters: boolean;
  hasAnyExtraTags: boolean;
  activeFiltersCount: number;
  handleInitMetadata: () => void;
  toggleTag: (tag: string) => void;
  toggleAuthor: (author: string) => void;
  itemsCount: number;
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
  visibleAuthors,
  visibleMiscTags,
  visibleGenreTags,
  hasActiveFilters,
  hasAnyExtraTags,
  activeFiltersCount,
  handleInitMetadata,
  toggleTag,
  toggleAuthor,
  itemsCount,
}: InstalledToolbarProps) {
  const { t, i18n } = useTranslation();

  const sortOptions = LOCAL_SORT_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.local_sort.${k}`, {
      defaultValue: LOCAL_SORT_OPTIONS[k],
    }),
  }));

  const categoryOptions = CATEGORY_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.category.${k || "empty"}`, {
      defaultValue: CATEGORIES[k] ?? k,
    }),
  }));

  const typeOptions = TYPE_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.type.${k || "empty"}`, {
      defaultValue: TYPES[k] ?? k,
    }),
  }));

  const ageOptions = AGE_RATING_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.age_rating.${k || "empty"}`, {
      defaultValue: AGE_RATINGS[k] ?? k,
    }),
  }));

  const resolutionOptions = RESOLUTION_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.resolution.${(k || "empty").replace(/ /g, "_")}`, {
      defaultValue: RESOLUTIONS[k] ?? k,
    }),
  }));

  return (
    <div className="flex flex-col gap-2 px-4 py-3 pb-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-55 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder={t("labels.search_placeholder")}
          />
        </div>
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
            className={cn(
              "flex h-9.5 items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2 text-sm transition-colors outline-none hover:border-border-strong",
            )}
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
        <Select
          value={sort}
          onValueChange={(v) => setSort(v as LocalSortKey)}
          options={sortOptions}
          icon={<SortAsc className="size-4 text-muted" />}
        />
        <Select
          value={category}
          onValueChange={(v) => setCategory(v)}
          options={categoryOptions}
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v)}
          options={typeOptions}
        />
        <Select
          value={age}
          onValueChange={(v) => setAge(v)}
          options={ageOptions}
        />
        <Select
          value={resolution}
          onValueChange={(v) => setResolution(v)}
          options={resolutionOptions}
        />
        {/* Bulk Selection Toggle */}
        <Tooltip content={t("tooltips.select_multiple")} side="bottom">
          <button
            type="button"
            onClick={() => setSelectionMode((prev) => !prev)}
            className={cn(
              "btn-icon",
              selectionMode && "bg-primary/10 text-primary",
            )}
            aria-label={t("tooltips.select_multiple")}
          >
            <CheckSquare className="size-5" />
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
            className="btn-icon"
            aria-label={t("settings.initialize_now") || "Initialize metadata"}
          >
            <Database className="size-5" />
          </button>
        </Tooltip>
        <div className={cn(
          "flex items-center rounded-md transition-all focus-within:ring-2 focus-within:ring-primary/50",
          hasActiveFilters && "border border-border/80"
        )}>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-label="Filters"
            className={cn(
              "relative flex size-9.5 items-center justify-center transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
              showAdvanced ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-raised hover:text-foreground",
              hasActiveFilters ? "rounded-l-[5px]" : "rounded-md"
            )}
            aria-expanded={showAdvanced}
            disabled={!hasAnyExtraTags}
          >
            <Filter className="size-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <>
              <div className="h-5.5 w-px bg-border/80" />
              <button
                type="button"
                className="flex size-9.5 items-center justify-center rounded-r-[5px] text-muted transition-colors outline-none hover:bg-danger/15 hover:text-danger"
                onClick={() => {
                  setTagFilters([]);
                  setExcludedTagFilters([]);
                  setAuthorFilters([]);
                  setExcludedAuthorFilters([]);
                  setCategory("");
                  setTypeFilter("");
                  setAge("");
                  setResolution("");
                  setSearch("");
                }}
                aria-label={t("labels.clear")}
              >
                <X className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            key="installed-advanced-filter-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col gap-2"
          >
            {visibleAuthors.length > 0 && (
              <FilterChipsRow
                title={t("labels.authors") || "Authors"}
                keys={visibleAuthors}
                active={authorFilters}
                excluded={excludedAuthorFilters}
                toggle={toggleAuthor}
                isFirst={true}
                isLast={
                  visibleMiscTags.length === 0 &&
                  visibleGenreTags.length === 0
                }
              />
            )}
            {visibleMiscTags.length > 0 && (
              <FilterChipsRow
                title={t("labels.miscellaneous") || "Miscellaneous"}
                keys={visibleMiscTags}
                active={tagFilters}
                excluded={excludedTagFilters}
                toggle={toggleTag}
                isFirst={visibleAuthors.length === 0}
                isLast={visibleGenreTags.length === 0}
                i18n={i18n}
                i18nPrefix="filters.misc_tags"
              />
            )}
            {visibleGenreTags.length > 0 && (
              <FilterChipsRow
                title={t("labels.genre") || "Genre"}
                keys={visibleGenreTags}
                active={tagFilters}
                excluded={excludedTagFilters}
                toggle={toggleTag}
                isFirst={
                  visibleAuthors.length === 0 &&
                  visibleMiscTags.length === 0
                }
                isLast={true}
                i18n={i18n}
                i18nPrefix="filters.genre_tags"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilterChipsRowProps {
  title: string;
  keys: readonly string[];
  active: string[];
  excluded: string[];
  toggle: (k: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  i18n?: any;
  i18nPrefix?: string;
}

function FilterChipsRow({
  title,
  keys,
  active,
  excluded,
  toggle,
  isFirst,
  isLast,
  i18n,
  i18nPrefix,
}: FilterChipsRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 p-0",
        isFirst && "pt-1",
        isLast && "pb-0",
      )}
    >
      <span className="text-[11px] tracking-wide text-subtle uppercase">
        {title}
      </span>
      {keys.map((k) => {
        const isIncluded = active.includes(k);
        const isExcluded = excluded.includes(k);
        const displayKey =
          i18n && i18nPrefix ? translateTag(k, i18nPrefix, i18n) : k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "chip cursor-pointer text-[11px] transition-colors select-none",
              !isIncluded && !isExcluded && "hover:bg-surface",
              isIncluded && "border-primary/60 bg-primary/15 text-foreground",
              isExcluded &&
                "border-danger/60 bg-danger/10 text-danger line-through",
            )}
          >
            {displayKey}
          </button>
        );
      })}
    </div>
  );
}
