import { useTranslation } from "@/i18n/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, SortAsc, X } from "lucide-react";
import { useEffect, useState } from "react";

import Select from "@/components/common/Select";
import {
  AGE_RATING_KEYS,
  AGE_RATINGS,
  ASSET_GENRE_KEYS,
  ASSET_GENRES,
  ASSET_TYPE_KEYS,
  ASSET_TYPES,
  CATEGORY_KEYS,
  CATEGORIES,
  GENRE_TAGS,
  MISC_TAGS,
  RESOLUTION_KEYS,
  RESOLUTIONS,
  SCRIPT_TYPE_KEYS,
  SCRIPT_TYPES,
  SORT_KEYS,
  SORT_OPTIONS,
  TIME_PERIOD_KEYS,
  TIME_PERIODS,
  TYPE_KEYS,
  TYPES,
  toSelectOptionsI18n,
  translateTag,
} from "@/lib/filterConfig";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, useFiltersStore } from "@/stores/filters";

type TagListKey = "misc_tags" | "genre_tags";

export default function FilterBar() {
  const { t, i18n } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const resetFilters = useFiltersStore((s) => s.resetFilters);
  const showAdvanced = useFiltersStore((s) => s.showAdvanced);
  const toggleAdvanced = useFiltersStore((s) => s.toggleAdvanced);

  // "Clear filters" should only be visible when something is actually set —
  // matches Installed's behaviour so the row stays calm at rest.
  const hasActiveFilters =
    filters.search !== DEFAULT_FILTERS.search ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.days !== DEFAULT_FILTERS.days ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.type_tag !== DEFAULT_FILTERS.type_tag ||
    filters.age_rating !== DEFAULT_FILTERS.age_rating ||
    filters.resolution !== DEFAULT_FILTERS.resolution ||
    filters.asset_type !== DEFAULT_FILTERS.asset_type ||
    filters.asset_genre !== DEFAULT_FILTERS.asset_genre ||
    filters.script_type !== DEFAULT_FILTERS.script_type ||
    filters.misc_tags.length > 0 ||
    filters.genre_tags.length > 0 ||
    filters.excluded_misc_tags.length > 0 ||
    filters.excluded_genre_tags.length > 0 ||
    filters.required_flags.length > 0;

  const [prevSearch, setPrevSearch] = useState(filters.search);
  const [searchValue, setSearchValue] = useState(filters.search);

  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setSearchValue(filters.search);
  }
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
  const categoryOptions = toSelectOptionsI18n(
    CATEGORY_KEYS,
    CATEGORIES,
    "filters.category",
    i18n,
  );
  const typeOptions = toSelectOptionsI18n(
    TYPE_KEYS,
    TYPES,
    "filters.type",
    i18n,
  );
  const ageRatingOptions = toSelectOptionsI18n(
    AGE_RATING_KEYS,
    AGE_RATINGS,
    "filters.age_rating",
    i18n,
  );
  const resolutionOptions = RESOLUTION_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.resolution.${(k || "empty").replace(/ /g, "_")}`, {
      defaultValue: RESOLUTIONS[k] ?? k,
    }),
  }));
  const assetTypeOptions = toSelectOptionsI18n(
    ASSET_TYPE_KEYS,
    ASSET_TYPES,
    "filters.asset_type",
    i18n,
  );
  const assetGenreOptions = ASSET_GENRE_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.asset_genre.${(k || "empty").replace(/ /g, "_")}`, {
      defaultValue: ASSET_GENRES[k] ?? k,
    }),
  }));
  const scriptTypeOptions = SCRIPT_TYPE_KEYS.map((k) => ({
    value: k,
    label: i18n.t(`filters.script_type.${(k || "empty").replace(/ /g, "_")}`, {
      defaultValue: SCRIPT_TYPES[k] ?? k,
    }),
  }));


  useEffect(() => {
    const t = setTimeout(() => {
      if (searchValue !== filters.search) {
        setFilters({ search: searchValue, page: 1 });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue, filters.search, setFilters]);

  const toggleTag = (list: TagListKey, tag: string) => {
    const current = filters[list];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    setFilters(
      list === "misc_tags"
        ? { misc_tags: next, page: 1 }
        : { genre_tags: next, page: 1 },
    );
  };

  const activeFiltersCount = [
    filters.days !== DEFAULT_FILTERS.days && filters.sort === "trend",
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
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 pb-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("labels.search_placeholder")}
            className="input pl-9"
          />
        </div>
        <Select
          value={filters.sort}
          onValueChange={(v) => setFilters({ sort: v, page: 1 })}
          options={sortOptions}
          icon={<SortAsc className="h-4 w-4 text-muted" />}
        />
        {filters.sort === "trend" && (
          <Select
            value={filters.days}
            onValueChange={(v) => setFilters({ days: v, page: 1 })}
            options={timePeriodOptions}
          />
        )}
        <Select
          value={filters.category}
          onValueChange={(v) => setFilters({ category: v, page: 1 })}
          options={categoryOptions}
        />
        {filters.category !== "Asset" && (
          <Select
            value={filters.type_tag}
            onValueChange={(v) => setFilters({ type_tag: v, page: 1 })}
            options={typeOptions}
          />
        )}
        {filters.category === "Wallpaper" && (
          <Select
            value={filters.resolution}
            onValueChange={(v) => setFilters({ resolution: v, page: 1 })}
            options={resolutionOptions}
          />
        )}
        {filters.category === "Asset" && (
          <>
            <Select
              value={filters.asset_type}
              onValueChange={(v) => setFilters({ asset_type: v, page: 1 })}
              options={assetTypeOptions}
            />
            <Select
              value={filters.asset_genre}
              onValueChange={(v) => setFilters({ asset_genre: v, page: 1 })}
              options={assetGenreOptions}
            />
            <Select
              value={filters.script_type}
              onValueChange={(v) => setFilters({ script_type: v, page: 1 })}
              options={scriptTypeOptions}
            />
          </>
        )}
        <Select
          value={filters.age_rating}
          onValueChange={(v) => setFilters({ age_rating: v, page: 1 })}
          options={ageRatingOptions}
        />
        <div className={cn(
          "flex items-center transition-all focus-within:ring-2 focus-within:ring-primary/50 rounded-md",
          hasActiveFilters && "border border-border/80"
        )}>
          <button
            onClick={toggleAdvanced}
            className={cn(
              "relative flex h-[38px] w-[38px] items-center justify-center outline-none transition-colors",
              showAdvanced ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-surface-raised",
              hasActiveFilters ? "rounded-l-[5px]" : "rounded-md"
            )}
            aria-expanded={showAdvanced}
          >
            <Filter className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <>
              <div className="h-[22px] w-[1px] bg-border/80" />
              <button
                onClick={resetFilters}
                className="flex h-[38px] w-[38px] items-center justify-center rounded-r-[5px] outline-none transition-colors text-muted hover:bg-danger/15 hover:text-danger"
                aria-label={t("labels.clear")}
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            key="advanced-filter-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col gap-2"
          >
            <TagBlock
              title={t("labels.miscellaneous")}
              tags={MISC_TAGS}
              included={filters.misc_tags}
              excluded={filters.excluded_misc_tags}
              onToggleInclude={(tag) => toggleTag("misc_tags", tag)}
              onToggleExclude={(tag) => {
                const current = filters.excluded_misc_tags;
                const next = current.includes(tag)
                  ? current.filter((t) => t !== tag)
                  : [...current, tag];
                setFilters({ excluded_misc_tags: next, page: 1 });
              }}
              isFirst={true}
              isLast={false}
              i18n={i18n}
              i18nPrefix="filters.misc_tags"
            />
            <TagBlock
              title={t("labels.genre")}
              tags={GENRE_TAGS}
              included={filters.genre_tags}
              excluded={filters.excluded_genre_tags}
              onToggleInclude={(tag) => toggleTag("genre_tags", tag)}
              onToggleExclude={(tag) => {
                const current = filters.excluded_genre_tags;
                const next = current.includes(tag)
                  ? current.filter((t) => t !== tag)
                  : [...current, tag];
                setFilters({ excluded_genre_tags: next, page: 1 });
              }}
              isFirst={false}
              isLast={true}
              i18n={i18n}
              i18nPrefix="filters.genre_tags"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagBlock({
  title,
  tags,
  included,
  excluded,
  onToggleInclude,
  onToggleExclude,
  isFirst,
  isLast,
  i18n,
  i18nPrefix,
}: {
  title: string;
  tags: string[];
  included: string[];
  excluded: string[];
  onToggleInclude: (tag: string) => void;
  onToggleExclude: (tag: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
  i18n?: any;
  i18nPrefix?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 px-0 py-0",
        isFirst && "pt-1",
        isLast && "pb-0",
      )}
    >
      <span className="text-[11px] uppercase tracking-wide text-subtle">
        {title}
      </span>
      {tags.map((tag) => {
        const isIncluded = included.includes(tag);
        const isExcluded = excluded.includes(tag);
        const displayTag =
          i18n && i18nPrefix ? translateTag(tag, i18nPrefix, i18n) : tag;
        return (
          <button
            key={tag}
            onClick={() => {
              if (isExcluded) {
                onToggleExclude(tag);
              } else if (isIncluded) {
                onToggleInclude(tag);
                onToggleExclude(tag);
              } else {
                onToggleInclude(tag);
              }
            }}
            className={cn(
              "chip cursor-pointer select-none text-[11px] transition-colors",
              !isIncluded && !isExcluded && "hover:bg-surface",
              isIncluded && "border-primary/60 bg-primary/15 text-foreground",
              isExcluded &&
                "border-danger/60 bg-danger/10 text-danger line-through",
            )}
          >
            {displayTag}
          </button>
        );
      })}
    </div>
  );
}
