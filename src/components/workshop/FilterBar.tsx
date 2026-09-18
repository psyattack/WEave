import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import { RotateCcw, Search, SlidersHorizontal, SortAsc, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Select from "@/components/common/Select";
import { Tooltip } from "@/components/common/Tooltip";
import SearchOptionsPopover from "./SearchOptionsPopover";
import {
  SORT_KEYS,
  SORT_OPTIONS,
  TIME_PERIOD_KEYS,
  TIME_PERIODS,
  toSelectOptionsI18n,
  translateTag,
  translateTagValue,
} from "@/lib/filterConfig";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app";
import { DEFAULT_FILTERS, useFiltersStore } from "@/stores/filters";

interface ActiveChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export default function FilterBar() {
  const { t, i18n } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const resetFilters = useFiltersStore((s) => s.resetFilters);
  const showAdvanced = useFiltersStore((s) => s.showAdvanced);
  const toggleAdvanced = useFiltersStore((s) => s.toggleAdvanced);
  const showActiveFilters = useAppStore((s) => s.showActiveFilters);

  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [prevSearch, setPrevSearch] = useState(filters.search);
  const [searchValue, setSearchValue] = useState(filters.search);

  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setSearchValue(filters.search);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters({ search: searchValue, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, setFilters]);

  useEffect(() => {
    if (!searchDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchDropdownOpen]);

  const sortOptions = toSelectOptionsI18n(
    SORT_KEYS,
    SORT_OPTIONS,
    "filters.sort",
    i18n,
  );
  const timePeriodOptions = toSelectOptionsI18n(
    TIME_PERIOD_KEYS,
    TIME_PERIODS,
    "filters.time_period",
    i18n,
  );

  const isIncompatible = filters.required_flags.includes("incompatible");
  const hasActiveDateFilter = Boolean(
    filters.created_date_range_start ||
    filters.created_date_range_end ||
    filters.updated_date_range_start ||
    filters.updated_date_range_end,
  );


  const activeDrawerFiltersCount = [
    filters.category !== DEFAULT_FILTERS.category,
    filters.type_tag !== DEFAULT_FILTERS.type_tag,
    filters.age_rating !== DEFAULT_FILTERS.age_rating,
    filters.resolution !== DEFAULT_FILTERS.resolution,
    filters.asset_type !== DEFAULT_FILTERS.asset_type,
    filters.asset_genre !== DEFAULT_FILTERS.asset_genre,
    filters.script_type !== DEFAULT_FILTERS.script_type,
    filters.misc_tags.length > 0,
    filters.genre_tags.length > 0,
    filters.excluded_misc_tags.length > 0,
    filters.excluded_genre_tags.length > 0,
    filters.required_flags.length > 0,
    hasActiveDateFilter,
  ].filter(Boolean).length;

  // Construct active chips list for quick display and dismissal
  const activeChips: ActiveChip[] = [];

  if (filters.category) {
    activeChips.push({
      id: "category",
      label: `${t("tag_categories.Category")}: ${translateTagValue(filters.category, "Category", i18n)}`,
      onRemove: () => setFilters({ category: "", page: 1 }),
    });
  }

  if (filters.type_tag) {
    activeChips.push({
      id: "type_tag",
      label: `${t("tag_categories.Type")}: ${translateTagValue(filters.type_tag, "Type", i18n)}`,
      onRemove: () => setFilters({ type_tag: "", page: 1 }),
    });
  }

  if (filters.resolution) {
    activeChips.push({
      id: "resolution",
      label: `${t("tag_categories.Resolution")}: ${translateTagValue(filters.resolution, "Resolution", i18n)}`,
      onRemove: () => setFilters({ resolution: "", page: 1 }),
    });
  }

  if (filters.age_rating) {
    activeChips.push({
      id: "age_rating",
      label: `${t("tag_categories.Age Rating")}: ${translateTagValue(filters.age_rating, "Age Rating", i18n)}`,
      onRemove: () => setFilters({ age_rating: "", page: 1 }),
    });
  }

  if (filters.asset_type) {
    activeChips.push({
      id: "asset_type",
      label: `${t("tag_categories.Asset Type")}: ${translateTagValue(filters.asset_type, "Asset Type", i18n)}`,
      onRemove: () => setFilters({ asset_type: "", page: 1 }),
    });
  }

  if (filters.asset_genre) {
    activeChips.push({
      id: "asset_genre",
      label: `${t("tag_categories.Asset Genre")}: ${translateTagValue(filters.asset_genre, "Asset Genre", i18n)}`,
      onRemove: () => setFilters({ asset_genre: "", page: 1 }),
    });
  }

  if (filters.script_type) {
    activeChips.push({
      id: "script_type",
      label: `${t("tag_categories.Script Type")}: ${translateTagValue(filters.script_type, "Script Type", i18n)}`,
      onRemove: () => setFilters({ script_type: "", page: 1 }),
    });
  }

  if (isIncompatible) {
    activeChips.push({
      id: "incompatible",
      label: t("filters.incompatible_items"),
      onRemove: () =>
        setFilters({
          required_flags: filters.required_flags.filter((f) => f !== "incompatible"),
          page: 1,
        }),
    });
  }

  if (hasActiveDateFilter) {
    activeChips.push({
      id: "date",
      label: t("filters.date_filter.title"),
      onRemove: () =>
        setFilters({
          created_date_range_start: "",
          created_date_range_end: "",
          updated_date_range_start: "",
          updated_date_range_end: "",
          page: 1,
        }),
    });
  }

  for (const tag of filters.misc_tags) {
    activeChips.push({
      id: `misc_inc_${tag}`,
      label: `+${translateTag(tag, "filters.misc_tags", i18n)}`,
      onRemove: () =>
        setFilters({
          misc_tags: filters.misc_tags.filter((t) => t !== tag),
          page: 1,
        }),
    });
  }

  for (const tag of filters.excluded_misc_tags) {
    activeChips.push({
      id: `misc_exc_${tag}`,
      label: `-${translateTag(tag, "filters.misc_tags", i18n)}`,
      onRemove: () =>
        setFilters({
          excluded_misc_tags: filters.excluded_misc_tags.filter((t) => t !== tag),
          page: 1,
        }),
    });
  }

  for (const tag of filters.genre_tags) {
    activeChips.push({
      id: `genre_inc_${tag}`,
      label: `+${translateTag(tag, "filters.genre_tags", i18n)}`,
      onRemove: () =>
        setFilters({
          genre_tags: filters.genre_tags.filter((t) => t !== tag),
          page: 1,
        }),
    });
  }

  for (const tag of filters.excluded_genre_tags) {
    activeChips.push({
      id: `genre_exc_${tag}`,
      label: `-${translateTag(tag, "filters.genre_tags", i18n)}`,
      onRemove: () =>
        setFilters({
          excluded_genre_tags: filters.excluded_genre_tags.filter((t) => t !== tag),
          page: 1,
        }),
    });
  }

  if (filters.search_text_mode === 1) {
    activeChips.push({
      id: "search_text_mode",
      label: t("filters.search_fields.title_only"),
      onRemove: () => setFilters({ search_text_mode: 0, page: 1 }),
    });
  } else if (filters.search_text_mode === 2) {
    activeChips.push({
      id: "search_text_mode",
      label: t("filters.search_fields.description_only"),
      onRemove: () => setFilters({ search_text_mode: 0, page: 1 }),
    });
  }

  const hasAnyFilters =
    activeDrawerFiltersCount > 0 ||
    activeChips.length > 0 ||
    Boolean(filters.search);

  return (
    <div className="relative z-30 flex flex-col items-center gap-2 px-4 py-3 pb-1.5">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Search Input with Smart Dropdown */}
        <div className="relative z-20 w-96" ref={searchContainerRef}>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchDropdownOpen(true)}
            onClick={() => setSearchDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchDropdownOpen(false);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Enter") {
                setSearchDropdownOpen(false);
              }
            }}
            placeholder={t("labels.search_placeholder")}
            className={cn(
              "input px-9 transition-colors hover:border-border-strong focus:border-border-strong focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
              searchDropdownOpen && "border-border-strong bg-surface-raised/40",
            )}
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                setFilters({ search: "", page: 1 });
              }}
              className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-subtle transition-colors hover:bg-surface-raised hover:text-foreground"
              aria-label={t("common.clear")}
            >
              <X className="size-3.5" />
            </button>
          ) : null}

          <SearchOptionsPopover
            open={searchDropdownOpen}
            onClose={() => setSearchDropdownOpen(false)}
          />
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters({ sort: v, page: 1 })}
            options={sortOptions}
            icon={<SortAsc className="size-4 text-muted" />}
          />

          {filters.sort === "trend" && (
            <Select
              value={filters.days}
              onValueChange={(v) => setFilters({ days: v, page: 1 })}
              options={timePeriodOptions}
            />
          )}

          {/* Workshop Filters Drawer Toggle: Icon only with Tooltip & badge */}
          <Tooltip content={t("filters.workshop_filters")} side="bottom">
            <button
              type="button"
              onClick={toggleAdvanced}
              className={cn(
                "relative flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted transition-colors outline-none hover:border-border-strong hover:text-foreground focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none",
                showAdvanced &&
                  "border-primary/60 bg-primary/10 text-primary hover:border-primary",
              )}
              aria-label={t("filters.workshop_filters")}
            >
              <SlidersHorizontal className="size-4" />
              {activeDrawerFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeDrawerFiltersCount}
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
                  onClick={resetFilters}
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
            onClick={resetFilters}
            className="ml-1 cursor-pointer text-[11px] font-medium text-muted underline transition-colors hover:text-danger"
          >
            {t("filters.reset_all")}
          </button>
        </div>
      )}
    </div>
  );
}
