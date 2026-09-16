import { useTranslation } from "@/i18n/hooks";
import { AlertCircle, Calendar, ChevronDown, ChevronRight, Layers, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import Drawer from "@/components/common/Drawer";
import Select from "@/components/common/Select";
import { Tooltip } from "@/components/common/Tooltip";
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
  TYPE_KEYS,
  TYPES,
  dateStrToTs,
  toSelectOptionsI18n,
  translateTag,
  tsToDateStr,
} from "@/lib/filterConfig";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, useFiltersStore } from "@/stores/filters";

type TagListKey = "misc_tags" | "genre_tags";

interface WorkshopFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WorkshopFilterDrawer({
  open,
  onOpenChange,
}: WorkshopFilterDrawerProps) {
  const { t, i18n } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const resetFilters = useFiltersStore((s) => s.resetFilters);

  const [assetsOpen, setAssetsOpen] = useState(
    Boolean(
      filters.category === "Asset" ||
      filters.asset_type ||
      filters.asset_genre ||
      filters.script_type,
    ),
  );
  const [datesOpen, setDatesOpen] = useState(false);

  const isIncompatible = filters.required_flags.includes("incompatible");
  const hasActiveDateFilter = Boolean(
    filters.created_date_range_start ||
    filters.created_date_range_end ||
    filters.updated_date_range_start ||
    filters.updated_date_range_end,
  );

  const hasActiveFilters =
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
    filters.required_flags.length > 0 ||
    hasActiveDateFilter;

  const activeFiltersCount = [
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

  const toggleIncompatible = () => {
    const current = filters.required_flags;
    const next = current.includes("incompatible")
      ? current.filter((f) => f !== "incompatible")
      : [...current, "incompatible"];
    setFilters({ required_flags: next, page: 1 });
  };

  const clearDates = () => {
    setFilters({
      created_date_range_start: "",
      created_date_range_end: "",
      updated_date_range_start: "",
      updated_date_range_end: "",
      page: 1,
    });
  };

  const hasAssetsActive = Boolean(
    filters.asset_type || filters.asset_genre || filters.script_type,
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="left"
      width="390px"
      title={
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <span>{t("filters.workshop_filters")}</span>
          {activeFiltersCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {activeFiltersCount}
            </span>
          )}
        </div>
      }
      headerAction={
        <Tooltip content={t("filters.reset_all")}>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors outline-none hover:bg-danger/15 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
            aria-label={t("filters.reset_all")}
          >
            <RotateCcw className="size-4" />
          </button>
        </Tooltip>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-subtle">
            {t("tag_categories.Category")}
          </label>
          <Select
            value={filters.category}
            onValueChange={(v) => setFilters({ category: v, page: 1 })}
            options={categoryOptions}
            className="w-full justify-between"
          />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-subtle">
            {t("tag_categories.Type")}
          </label>
          <Select
            value={filters.type_tag}
            onValueChange={(v) => setFilters({ type_tag: v, page: 1 })}
            options={typeOptions}
            className="w-full justify-between"
          />
        </div>

        {/* Resolution */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-subtle">
            {t("tag_categories.Resolution")}
          </label>
          <Select
            value={filters.resolution}
            onValueChange={(v) => setFilters({ resolution: v, page: 1 })}
            options={resolutionOptions}
            className="w-full justify-between"
          />
        </div>

        {/* Age Rating */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-subtle">
            {t("tag_categories.Age Rating")}
          </label>
          <Select
            value={filters.age_rating}
            onValueChange={(v) => setFilters({ age_rating: v, page: 1 })}
            options={ageRatingOptions}
            className="w-full justify-between"
          />
        </div>

        <div className="h-px bg-border/50" />

        {/* Assets & Scripts (Collapsible Card) */}
        <div className="rounded-lg border border-border/70 bg-surface-sunken/40">
          <button
            type="button"
            onClick={() => setAssetsOpen(!assetsOpen)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-muted" />
              <span className="text-xs font-semibold text-foreground">
                {t("filters.assets_and_scripts")}
              </span>
              {hasAssetsActive && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            {assetsOpen ? (
              <ChevronDown className="size-4 text-muted" />
            ) : (
              <ChevronRight className="size-4 text-muted" />
            )}
          </button>

          {assetsOpen && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-3 pt-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-subtle">
                  {t("tag_categories.Asset Type")}
                </label>
                <Select
                  value={filters.asset_type}
                  onValueChange={(v) => setFilters({ asset_type: v, page: 1 })}
                  options={assetTypeOptions}
                  className="w-full justify-between"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-subtle">
                  {t("tag_categories.Asset Genre")}
                </label>
                <Select
                  value={filters.asset_genre}
                  onValueChange={(v) => setFilters({ asset_genre: v, page: 1 })}
                  options={assetGenreOptions}
                  className="w-full justify-between"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-subtle">
                  {t("tag_categories.Script Type")}
                </label>
                <Select
                  value={filters.script_type}
                  onValueChange={(v) => setFilters({ script_type: v, page: 1 })}
                  options={scriptTypeOptions}
                  className="w-full justify-between"
                />
              </div>
            </div>
          )}
        </div>

        {/* Date Filter (Collapsible Card) */}
        <div className="rounded-lg border border-border/70 bg-surface-sunken/40">
          <button
            type="button"
            onClick={() => setDatesOpen(!datesOpen)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted" />
              <span className="text-xs font-semibold text-foreground">
                {t("filters.date_filter.title")}
              </span>
              {hasActiveDateFilter && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            {datesOpen ? (
              <ChevronDown className="size-4 text-muted" />
            ) : (
              <ChevronRight className="size-4 text-muted" />
            )}
          </button>

          {datesOpen && (
            <div className="flex flex-col gap-3 border-t border-border/60 p-3 pt-2.5">
              {/* Created Date Range */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted">
                  {t("filters.date_filter.time_created")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-subtle">
                      {t("filters.date_filter.from")}
                    </label>
                    <input
                      type="date"
                      value={tsToDateStr(filters.created_date_range_start)}
                      onChange={(e) =>
                        setFilters({
                          created_date_range_start: dateStrToTs(e.target.value, false),
                          page: 1,
                        })
                      }
                      className="input px-2 py-1 text-xs scheme-dark"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-subtle">
                      {t("filters.date_filter.to")}
                    </label>
                    <input
                      type="date"
                      value={tsToDateStr(filters.created_date_range_end)}
                      onChange={(e) =>
                        setFilters({
                          created_date_range_end: dateStrToTs(e.target.value, true),
                          page: 1,
                        })
                      }
                      className="input px-2 py-1 text-xs scheme-dark"
                    />
                  </div>
                </div>
              </div>

              {/* Updated Date Range */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted">
                  {t("filters.date_filter.time_updated")}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-subtle">
                      {t("filters.date_filter.from")}
                    </label>
                    <input
                      type="date"
                      value={tsToDateStr(filters.updated_date_range_start)}
                      onChange={(e) =>
                        setFilters({
                          updated_date_range_start: dateStrToTs(e.target.value, false),
                          page: 1,
                        })
                      }
                      className="input px-2 py-1 text-xs scheme-dark"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-subtle">
                      {t("filters.date_filter.to")}
                    </label>
                    <input
                      type="date"
                      value={tsToDateStr(filters.updated_date_range_end)}
                      onChange={(e) =>
                        setFilters({
                          updated_date_range_end: dateStrToTs(e.target.value, true),
                          page: 1,
                        })
                      }
                      className="input px-2 py-1 text-xs scheme-dark"
                    />
                  </div>
                </div>
              </div>

              {hasActiveDateFilter && (
                <button
                  type="button"
                  onClick={clearDates}
                  className="flex cursor-pointer items-center gap-1.5 self-start text-[11px] text-muted hover:text-danger"
                >
                  <X className="size-3" />
                  <span>{t("filters.date_filter.clear")}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-border/50" />

        {/* Special Filters: Incompatible Items */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-subtle">
            {t("filters.special_filters")}
          </span>
          <button
            type="button"
            onClick={toggleIncompatible}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors select-none",
              isIncompatible
                ? "border-warning/60 bg-warning/10 text-foreground"
                : "border-border bg-surface-sunken/40 text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            <AlertCircle
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isIncompatible ? "text-warning" : "text-subtle",
              )}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold">
                {t("filters.incompatible_items")}
              </span>
              <span className="text-[11px] leading-tight text-subtle">
                {t("filters.incompatible_desc")}
              </span>
            </div>
          </button>
        </div>

        <div className="h-px bg-border/50" />

        {/* Miscellaneous Tags */}
        <DrawerTagBlock
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
          i18n={i18n}
          i18nPrefix="filters.misc_tags"
        />

        <div className="h-px bg-border/50" />

        {/* Genre Tags */}
        <DrawerTagBlock
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
          i18n={i18n}
          i18nPrefix="filters.genre_tags"
        />
      </div>
    </Drawer>
  );
}

function DrawerTagBlock({
  title,
  tags,
  included,
  excluded,
  onToggleInclude,
  onToggleExclude,
  i18n,
  i18nPrefix,
}: {
  title: string;
  tags: string[];
  included: string[];
  excluded: string[];
  onToggleInclude: (tag: string) => void;
  onToggleExclude: (tag: string) => void;
  i18n?: any;
  i18nPrefix?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-subtle">{title}</span>
      <div className="flex flex-wrap items-center gap-1.5">
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
                "chip cursor-pointer text-xs transition-colors select-none",
                !isIncluded && !isExcluded && "hover:bg-surface",
                isIncluded && "border-primary/60 bg-primary/15 font-medium text-foreground",
                isExcluded &&
                  "border-danger/60 bg-danger/10 text-danger line-through",
              )}
            >
              {displayTag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
