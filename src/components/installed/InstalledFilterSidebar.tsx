import { AnimatePresence, motion } from "framer-motion";
import Select from "@/components/common/Select";
import { useTranslation } from "@/i18n/hooks";
import {
  AGE_RATING_KEYS,
  AGE_RATINGS,
  CATEGORY_KEYS,
  CATEGORIES,
  RESOLUTION_KEYS,
  RESOLUTIONS,
  TYPE_KEYS,
  TYPES,
  translateTag,
} from "@/lib/filterConfig";
import { cn } from "@/lib/utils";

interface InstalledFilterSidebarProps {
  open: boolean;
  category: string;
  setCategory: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  age: string;
  setAge: (v: string) => void;
  resolution: string;
  setResolution: (v: string) => void;
  tagFilters: string[];
  toggleTag: (tag: string) => void;
  excludedTagFilters: string[];
  authorFilters: string[];
  toggleAuthor: (author: string) => void;
  excludedAuthorFilters: string[];
  visibleAuthors: string[];
  visibleMiscTags: string[];
  visibleGenreTags: string[];
}

export default function InstalledFilterSidebar({
  open,
  category,
  setCategory,
  typeFilter,
  setTypeFilter,
  age,
  setAge,
  resolution,
  setResolution,
  tagFilters,
  toggleTag,
  excludedTagFilters,
  authorFilters,
  toggleAuthor,
  excludedAuthorFilters,
  visibleAuthors,
  visibleMiscTags,
  visibleGenreTags,
}: InstalledFilterSidebarProps) {
  const { t, i18n } = useTranslation();

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
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 36,
          }}
          className="relative z-10 flex h-full shrink-0 flex-col overflow-hidden"
        >
          <div className="flex h-full w-[340px] flex-col">
            {/* Scrollable Body */}
            <div className="drawer-scroll flex flex-1 flex-col gap-4 overflow-y-auto py-3 pr-0 pl-4">
              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-subtle">
                  {t("tag_categories.Category")}
                </label>
                <Select
                  value={category}
                  onValueChange={setCategory}
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
                  value={typeFilter}
                  onValueChange={setTypeFilter}
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
                  value={resolution}
                  onValueChange={setResolution}
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
                  value={age}
                  onValueChange={setAge}
                  options={ageOptions}
                  className="w-full justify-between"
                />
              </div>

              {visibleAuthors.length > 0 && (
                <>
                  <div className="h-px shrink-0 bg-border/60" />
                  <InstalledTagBlock
                    title={t("labels.authors") || "Authors"}
                    tags={visibleAuthors}
                    included={authorFilters}
                    excluded={excludedAuthorFilters}
                    onToggle={toggleAuthor}
                  />
                </>
              )}

              {visibleMiscTags.length > 0 && (
                <>
                  <div className="h-px shrink-0 bg-border/60" />
                  <InstalledTagBlock
                    title={t("labels.miscellaneous") || "Miscellaneous"}
                    tags={visibleMiscTags}
                    included={tagFilters}
                    excluded={excludedTagFilters}
                    onToggle={toggleTag}
                    i18n={i18n}
                    i18nPrefix="filters.misc_tags"
                  />
                </>
              )}

              {visibleGenreTags.length > 0 && (
                <>
                  <div className="h-px shrink-0 bg-border/60" />
                  <InstalledTagBlock
                    title={t("labels.genre") || "Genre"}
                    tags={visibleGenreTags}
                    included={tagFilters}
                    excluded={excludedTagFilters}
                    onToggle={toggleTag}
                    i18n={i18n}
                    i18nPrefix="filters.genre_tags"
                  />
                </>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function InstalledTagBlock({
  title,
  tags,
  included,
  excluded,
  onToggle,
  i18n,
  i18nPrefix,
}: {
  title: string;
  tags: readonly string[];
  included: string[];
  excluded: string[];
  onToggle: (tag: string) => void;
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
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                "chip cursor-pointer text-xs transition-colors select-none",
                !isIncluded && !isExcluded && "hover:bg-surface",
                isIncluded &&
                  "border-primary/60 bg-primary/15 font-medium text-foreground",
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
