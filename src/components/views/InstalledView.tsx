import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckSquare,
  Copy,
  Database,
  Filter,
  FolderOpen,
  Package,
  Play,
  Search,
  SortAsc,
  Trash2,
  X,
} from "lucide-react";
import { open as openPath } from "@tauri-apps/plugin-dialog";

import PreviewImage from "@/components/common/PreviewImage";
import DetailsPanel from "@/components/common/DetailsPanel";
import Select from "@/components/common/Select";
import { useAppStore } from "@/stores/app";
import { inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { maybeMinimize } from "@/lib/window";
import { pushToast } from "@/stores/toasts";
import { useRefreshStore } from "@/stores/refresh";
import { InstalledWallpaper } from "@/types/workshop";
import { cn, formatBytes } from "@/lib/utils";
import { extractTagLabel, parseRatingStars } from "@/lib/workshop";
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
  MISC_TAG_KEYS,
  GENRE_TAG_KEYS,
  type LocalSortKey,
} from "@/lib/filterConfig";
import { useConfirm } from "@/hooks/useConfirm";
import { Tooltip } from "@/components/common/Tooltip";
import { useMetadataInitStore } from "@/stores/metadata-init";
import { triggerGlobalRefresh } from "@/stores/refresh";

interface InstalledMetadata {
  tags?: unknown[];
  rating_star_file?: string;
  posted_date?: string;
  updated_date?: string;
}

export default function InstalledView() {
  const { t, i18n } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const weDirectory = useAppStore((s) => s.weDirectory);
  const [items, setItems] = useState<InstalledWallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [resolution, setResolution] = useState<string>("");
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [excludedTagFilters, setExcludedTagFilters] = useState<string[]>([]);
  const [authorFilters, setAuthorFilters] = useState<string[]>([]);
  const [excludedAuthorFilters, setExcludedAuthorFilters] = useState<string[]>(
    [],
  );
  const [sort, setSort] = useState<LocalSortKey>("install_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<InstalledWallpaper | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [metaMap, setMetaMap] = useState<Record<string, InstalledMetadata>>({});

  const refresh = async () => {
    if (!inTauri) {
      setItems(makeMockInstalled());
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await tryInvoke<InstalledWallpaper[]>(
      "we_list_installed",
      undefined,
      [],
    );
    setItems(list ?? []);
    const meta = await tryInvoke<Record<string, InstalledMetadata>>(
      "metadata_get_all",
      undefined,
      {},
    );
    setMetaMap(meta ?? {});
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [weDirectory]);

  const refreshCounter = useRefreshStore((s) => s.counter);
  useEffect(() => {
    if (refreshCounter === 0) return;
    void refresh();
  }, [refreshCounter, weDirectory]);

  // Re-fetch cached metadata (without re-scanning disk) whenever the
  // details drawer closes — so tags pulled via workshop_get_item while the
  // drawer was open immediately populate the filter chips below.
  useEffect(() => {
    if (!inTauri || selected !== null) return;
    void (async () => {
      const meta = await tryInvoke<Record<string, InstalledMetadata>>(
        "metadata_get_all",
        undefined,
        {},
      );
      if (meta) setMetaMap(meta);
    })();
  }, [selected]);

  const tagsFor = useMemo(
    () =>
      (item: InstalledWallpaper): Set<string> => {
        const set = new Set<string>(item.tags);
        const raw = metaMap[item.pubfileid]?.tags;
        if (Array.isArray(raw)) {
          for (const tag of raw) {
            const label =
              typeof tag === "string"
                ? tag
                : typeof tag === "object" && tag && "tag" in tag
                  ? extractTagLabel(tag as { tag?: string })
                  : "";
            if (label) set.add(label);
          }
        }
        return set;
      },
    [metaMap],
  );

  const metaFor = useMemo(
    () => (item: InstalledWallpaper) => metaMap[item.pubfileid],
    [metaMap],
  );

  // Collapse every tag actually present on the local wallpapers (both from
  // `project.json` and the Workshop metadata cache) into a single Set. This
  // drives the Misc/Genre filter chips so users only see tags that will
  // actually narrow the current Installed list — the original PyQt6 app
  // behaved the same way.
  const presentTags = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      for (const tag of tagsFor(it)) set.add(tag);
    }
    return set;
  }, [items, tagsFor]);

  const visibleMiscTags = useMemo(
    () => MISC_TAG_KEYS.filter((k) => presentTags.has(k)),
    [presentTags],
  );
  const visibleGenreTags = useMemo(
    () => GENRE_TAG_KEYS.filter((k) => presentTags.has(k)),
    [presentTags],
  );

  // Collect all unique authors from metadata
  const visibleAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    for (const item of items) {
      const author = (
        metaMap[item.pubfileid] as { author?: string } | undefined
      )?.author;
      if (author && author.trim()) {
        authorSet.add(author.trim());
      }
    }
    return Array.from(authorSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [items, metaMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = items.filter((item) => {
      if (q) {
        const inTitle = item.title.toLowerCase().includes(q);
        const inId = item.pubfileid.includes(q);
        if (!inTitle && !inId) return false;
      }
      const has = tagsFor(item);
      if (category && !has.has(category)) return false;
      if (typeFilter) {
        // Steam tags both Workshop "Type" and project.json's `type` (e.g. "scene"
        // / "video" / "web" / "application") — match either.
        const ft = item.file_type?.toLowerCase() ?? "";
        const want = typeFilter.toLowerCase();
        if (!has.has(typeFilter) && ft !== want) return false;
      }
      if (age && !has.has(age)) return false;
      if (resolution && !has.has(resolution)) return false;
      if (tagFilters.length > 0) {
        if (!tagFilters.every((f) => has.has(f))) return false;
      }
      if (excludedTagFilters.length > 0) {
        if (excludedTagFilters.some((f) => has.has(f))) return false;
      }
      // Author filtering
      if (authorFilters.length > 0 || excludedAuthorFilters.length > 0) {
        const author =
          (
            metaMap[item.pubfileid] as { author?: string } | undefined
          )?.author?.trim() || "";
        if (authorFilters.length > 0 && !authorFilters.includes(author))
          return false;
        if (
          excludedAuthorFilters.length > 0 &&
          excludedAuthorFilters.includes(author)
        )
          return false;
      }
      return true;
    });
    const dir = sortOrder === "asc" ? 1 : -1;
    const ratingScore = (it: InstalledWallpaper) => {
      const star = metaFor(it)?.rating_star_file ?? "";
      return parseRatingStars(star);
    };
    const dateMs = (s?: string) => {
      if (!s) return 0;
      const t = Date.parse(s);
      return Number.isFinite(t) ? t : 0;
    };
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "install_date":
          return (a.installed_ts - b.installed_ts) * dir;
        case "name":
          return (
            a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) *
            dir
          );
        case "rating":
          return (ratingScore(a) - ratingScore(b)) * dir;
        case "size":
          return (a.size_bytes - b.size_bytes) * dir;
        case "posted_date":
          return (
            (dateMs(metaFor(a)?.posted_date) -
              dateMs(metaFor(b)?.posted_date)) *
            dir
          );
        case "updated_date":
          return (
            (dateMs(metaFor(a)?.updated_date) -
              dateMs(metaFor(b)?.updated_date)) *
            dir
          );
      }
    });
    return result;
  }, [
    items,
    search,
    category,
    typeFilter,
    age,
    resolution,
    tagFilters,
    sort,
    sortOrder,
    excludedTagFilters,
    authorFilters,
    excludedAuthorFilters,
    tagsFor,
    metaFor,
    metaMap,
  ]);

  const handleApply = async (item: InstalledWallpaper) => {
    if (!inTauri) {
      pushToast(`Apply ${item.pubfileid}`, "info");
      return;
    }
    const ok = await tryInvokeOk("we_apply", {
      projectPath: item.project_json_path,
      monitor: null,
      force: false,
    });
    pushToast(
      ok ? t("messages.wallpaper_applied") : t("messages.error"),
      ok ? "success" : "error",
    );
    if (ok) {
      void maybeMinimize();
    }
  };

  const handleDelete = async (item: InstalledWallpaper) => {
    if (inTauri) {
      // Block deletion of the currently-displayed wallpaper — Wallpaper
      // Engine still holds file handles and rmdir would half-complete.
      const active = await tryInvoke<string[]>(
        "we_active_pubfileids",
        undefined,
        [],
      );
      if ((active ?? []).includes(item.pubfileid)) {
        pushToast(
          t("messages.cannot_delete_active_single") ||
            "Wallpaper is currently active — switch first.",
          "error",
        );
        return;
      }
    }
    const confirmed = await confirm({
      title: t("tooltips.delete_wallpaper") || "Delete Wallpaper",
      message:
        t("messages.confirm_delete") ||
        "Delete this wallpaper?\n\nThe wallpaper folder will be removed from your Wallpaper Engine library permanently. This action cannot be undone.",
      confirmLabel: t("buttons.delete") || "Delete",
      cancelLabel: t("buttons.cancel") || "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    if (!inTauri) {
      setItems((prev) => prev.filter((i) => i.pubfileid !== item.pubfileid));
      pushToast(t("messages.wallpaper_deleted"), "success");
      return;
    }
    const ok = await tryInvokeOk("we_delete_wallpaper", {
      pubfileid: item.pubfileid,
    });
    if (ok) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      await refresh();
      triggerGlobalRefresh();
      setSelected(null);
    } else {
      // Backend may also catch the active-wallpaper case (race: user
      // applied the wallpaper between our check and the delete call).
      pushToast(
        t("messages.cannot_delete_active_single") ||
          "Wallpaper is currently active — switch first.",
        "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (inTauri) {
      const active = await tryInvoke<string[]>(
        "we_active_pubfileids",
        undefined,
        [],
      );
      const activeInSelection = Array.from(selectedIds).filter((id) =>
        (active ?? []).includes(id),
      );
      if (activeInSelection.length > 0) {
        pushToast(
          "Some wallpapers are currently active — switch first.",
          "error",
        );
        return;
      }
    }

    const confirmed = await confirm({
      title: "Delete Wallpapers",
      message: `Delete ${selectedIds.size} wallpapers?\n\nThe wallpaper folders will be removed from your Wallpaper Engine library permanently. This action cannot be undone.`,
      confirmLabel: t("buttons.delete") || "Delete",
      cancelLabel: t("buttons.cancel") || "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;

    if (!inTauri) {
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.pubfileid)));
      pushToast(`${selectedIds.size} wallpapers deleted`, "success");
      setSelectedIds(new Set());
      setSelectionMode(false);
      return;
    }

    let successCount = 0;
    for (const pubfileid of selectedIds) {
      const ok = await tryInvokeOk("we_delete_wallpaper", { pubfileid });
      if (ok) successCount++;
    }

    pushToast(
      `${successCount} wallpapers deleted`,
      successCount > 0 ? "success" : "error",
    );
    await refresh();
    triggerGlobalRefresh();
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelected(null);
  };

  const handleBulkExtract = async () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) =>
      selectedIds.has(item.pubfileid),
    );
    const withPkg = selectedItems.filter((item) => item.has_pkg);

    if (withPkg.length === 0) {
      pushToast("No PKG files available", "warning");
      return;
    }

    if (!inTauri) {
      pushToast(`Extracting ${withPkg.length} wallpapers`, "success");
      return;
    }

    const folder = await openPath({ directory: true });
    if (!folder || Array.isArray(folder)) return;

    let successCount = 0;
    for (const item of withPkg) {
      const ok = await tryInvokeOk("extract_start", {
        pubfileid: item.pubfileid,
        outputDir: folder,
      });
      if (ok) successCount++;
    }

    pushToast(
      `Extracting ${successCount} wallpapers`,
      successCount > 0 ? "success" : "error",
    );
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const toggleSelection = (pubfileid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pubfileid)) {
        next.delete(pubfileid);
      } else {
        next.add(pubfileid);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((item) => item.pubfileid)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleExtract = async (item: InstalledWallpaper) => {
    if (!item.has_pkg) {
      pushToast(t("messages.no_pkg_file"), "warning");
      return;
    }
    if (!inTauri) {
      pushToast(t("messages.extraction_started"), "success");
      return;
    }
    const folder = await openPath({ directory: true });
    if (!folder || Array.isArray(folder)) return;
    const ok = await tryInvokeOk("extract_start", {
      pubfileid: item.pubfileid,
      outputDir: folder,
    });
    pushToast(
      ok ? t("messages.extraction_started") : t("messages.error"),
      ok ? "success" : "error",
    );
  };

  const handleOpenFolder = async (item: InstalledWallpaper) => {
    if (!inTauri) return;
    await tryInvoke("open_path", { path: item.folder });
  };

  const handleCopyId = async (item: InstalledWallpaper) => {
    await navigator.clipboard.writeText(item.pubfileid);
    pushToast(t("messages.id_copied"), "success");
  };

  const handleInitMetadata = async () => {
    if (!inTauri) return;
    const setStatus = useMetadataInitStore.getState().setStatus;

    setStatus({
      phase: "initializing",
      message:
        t("metadata_init.fetching") ||
        "Fetching metadata for installed wallpapers...",
      progress: 0,
      total: items.length,
    });

    // Listen for progress events
    const { listen } = await import("@tauri-apps/api/event");
    const unlisten = await listen<{ current: number; total: number }>(
      "metadata-init-progress",
      (event) => {
        setStatus({
          phase: "initializing",
          message:
            t("metadata_init.fetching") ||
            "Fetching metadata for installed wallpapers...",
          progress: event.payload.current,
          total: event.payload.total,
        });
      },
    );

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const count = await invoke<number>("app_init_metadata");

      setStatus({
        phase: "complete",
        message:
          t("labels.metadata_initialized", { count: count ?? 0 }) ||
          `Initialized ${count ?? 0} wallpapers`,
        progress: count ?? 0,
        total: items.length,
      });

      triggerGlobalRefresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRateLimit =
        errorMessage.includes("429") ||
        errorMessage.toLowerCase().includes("rate limit");

      setStatus({
        phase: "error",
        message: isRateLimit
          ? t("metadata_init.rate_limit_error") ||
            "Rate limit exceeded. Please try again in a few minutes."
          : t("metadata_init.error_message") || "Failed to initialize metadata",
        progress: null,
        total: null,
      });
    } finally {
      unlisten();
    }
  };

  // Tristate cycle — idle → include → exclude → idle — matches the
  // Workshop / Collections FilterBar, so clicking a chip twice switches it
  // from "only show items with this tag" to "hide items with this tag",
  // and a third click resets it back to neutral.
  const toggleTag = (tag: string) => {
    const isIncluded = tagFilters.includes(tag);
    const isExcluded = excludedTagFilters.includes(tag);
    if (isExcluded) {
      setExcludedTagFilters((prev) => prev.filter((t) => t !== tag));
    } else if (isIncluded) {
      setTagFilters((prev) => prev.filter((t) => t !== tag));
      setExcludedTagFilters((prev) => [...prev, tag]);
    } else {
      setTagFilters((prev) => [...prev, tag]);
    }
  };

  const toggleAuthor = (author: string) => {
    const isIncluded = authorFilters.includes(author);
    const isExcluded = excludedAuthorFilters.includes(author);
    if (isExcluded) {
      setExcludedAuthorFilters((prev) => prev.filter((a) => a !== author));
    } else if (isIncluded) {
      setAuthorFilters((prev) => prev.filter((a) => a !== author));
      setExcludedAuthorFilters((prev) => [...prev, author]);
    } else {
      setAuthorFilters((prev) => [...prev, author]);
    }
  };

  const totalSize = filtered.reduce((sum, i) => sum + i.size_bytes, 0);
  const hasActiveFilters =
    tagFilters.length > 0 ||
    excludedTagFilters.length > 0 ||
    authorFilters.length > 0 ||
    excludedAuthorFilters.length > 0 ||
    category !== "" ||
    typeFilter !== "" ||
    age !== "" ||
    resolution !== "" ||
    search.length > 0;
  const hasAnyExtraTags =
    visibleAuthors.length > 0 ||
    visibleMiscTags.length > 0 ||
    visibleGenreTags.length > 0;

  // Prepare options for Select components
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

  const activeFiltersCount = [
    category !== "",
    typeFilter !== "",
    age !== "",
    resolution !== "",
    tagFilters.length > 0,
    excludedTagFilters.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 px-4 py-3 pb-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
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
              onClick={() =>
                setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
              }
              className={cn(
                "flex h-[38px] items-center gap-2 rounded-md bg-surface-sunken border border-border px-3 py-2 text-sm outline-none hover:border-border-strong transition-colors",
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
                  <ArrowUpAZ className="h-4 w-4" />
                ) : (
                  <ArrowDownAZ className="h-4 w-4" />
                )}
              </motion.span>
            </button>
          </Tooltip>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as LocalSortKey)}
            options={sortOptions}
            icon={<SortAsc className="h-4 w-4 text-muted" />}
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
          {/* Кнопка множественной выборки */}
          <Tooltip content="Select Multiple" side="bottom">
            <button
              type="button"
              onClick={() => setSelectionMode((prev) => !prev)}
              className={cn(
                "btn-icon",
                selectionMode && "bg-primary/10 text-primary",
              )}
              aria-label="Select multiple wallpapers"
            >
              <CheckSquare className="h-5 w-5" />
            </button>
          </Tooltip>
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
              disabled={!inTauri || items.length === 0}
              className="btn-icon"
              aria-label={t("settings.initialize_now") || "Initialize metadata"}
            >
              <Database className="h-5 w-5" />
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className={cn(
              "btn-icon relative",
              showAdvanced && "bg-primary/10 text-primary",
            )}
            aria-expanded={showAdvanced}
            disabled={!hasAnyExtraTags}
          >
            <Filter className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-icon"
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
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
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
              </motion.div>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {visibleMiscTags.length > 0 && (
                  <FilterChipsRow
                    title={t("labels.miscellaneous") || "Miscellaneous"}
                    keys={visibleMiscTags}
                    active={tagFilters}
                    excluded={excludedTagFilters}
                    toggle={toggleTag}
                    isFirst={visibleAuthors.length === 0}
                    isLast={visibleGenreTags.length === 0}
                  />
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
              >
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
                  />
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Панель управления выборкой */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-surface-sunken/50 px-3 py-2 border border-border">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Check className="h-4 w-4" />
                  Select All
                </button>
                <div className="flex items-center gap-2 rounded-md bg-surface px-3 py-1.5 text-sm font-medium">
                  {`${selectedIds.size} selected`}
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
                        Extract
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="btn-danger flex items-center gap-2 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            {t("labels.loading_dots")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <Package className="h-10 w-10 text-subtle" />
            {t("labels.no_wallpapers_found")}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
              {filtered.map((item) => (
                <motion.article
                  key={item.pubfileid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(item.pubfileid);
                    } else {
                      setSelected(item);
                    }
                  }}
                  className={cn(
                    "card card-hover group overflow-hidden cursor-pointer relative",
                    selected?.pubfileid === item.pubfileid &&
                      !selectionMode &&
                      "ring-2 ring-primary/70",
                    selectionMode &&
                      selectedIds.has(item.pubfileid) &&
                      "ring-2 ring-primary",
                  )}
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-sunken">
                    <PreviewImage
                      key={item.preview}
                      src={item.preview}
                      alt={item.title}
                      className="h-full w-full scale-[1.02] object-cover transition-all duration-700 ease-out group-hover:scale-[1.15] group-hover:brightness-75"
                    />

                    {/* Градиентный оверлей для читаемости текста */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

                    {/* Чекбокс для множественной выборки */}
                    {selectionMode && (
                      <div className="absolute left-2 top-2 z-[3]">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border-2 transition-all",
                            selectedIds.has(item.pubfileid)
                              ? "bg-primary border-primary"
                              : "bg-black/40 border-white/40 backdrop-blur-sm",
                          )}
                        >
                          {selectedIds.has(item.pubfileid) && (
                            <Check className="h-3.5 w-3.5 text-white" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Размер файла */}
                    <div
                      className={cn(
                        "absolute top-1.5 z-[2] transition-all",
                        selectionMode ? "left-9" : "left-2",
                      )}
                    >
                      <span className="inline-flex items-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm ring-1 ring-white/20">
                        {formatBytes(item.size_bytes)}
                      </span>
                    </div>

                    {/* Быстрые действия */}
                    {!selectionMode && (
                      <div className="absolute right-2 top-2 z-[2] flex flex-col gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(item);
                          }}
                          tooltip={t("tooltips.install_wallpaper")}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExtract(item);
                          }}
                          tooltip={t("tooltips.extract_wallpaper")}
                          disabled={!item.has_pkg}
                        >
                          <Package className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFolder(item);
                          }}
                          tooltip={t("tooltips.open_folder")}
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyId(item);
                          }}
                          tooltip={t("buttons.copy_id")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          tooltip={t("tooltips.delete_wallpaper")}
                          kind="danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    )}

                    {/* Название и автор поверх изображения */}
                    <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-0.5 px-2.5 pb-2.5 pt-6 pr-12 transition-all duration-300">
                      <h3
                        className="line-clamp-2 text-[13px] font-bold leading-tight text-white drop-shadow-lg transition-all duration-300 group-hover:translate-y-[-2px]"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] transition-all duration-300 group-hover:translate-y-[-2px]">
                        {(() => {
                          const author =
                            (
                              metaMap[item.pubfileid] as
                                | { author?: string }
                                | undefined
                            )?.author || "";
                          return (
                            <span
                              className="line-clamp-1 flex-1 font-medium text-white/90 drop-shadow-md"
                              title={author || undefined}
                            >
                              {author || "—"}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface/60 px-4 py-2 text-xs text-muted">
        <span>
          {t("labels.wallpapers_filtered", {
            filtered: filtered.length,
            total: items.length,
          })}
        </span>
        <span>{t("labels.total_size", { size: formatBytes(totalSize) })}</span>
      </div>

      <DetailsPanel
        kind="installed"
        item={selected}
        onClose={() => setSelected(null)}
        onApply={handleApply}
        onExtract={handleExtract}
        onDelete={handleDelete}
        onOpenFolder={handleOpenFolder}
        onCopyId={handleCopyId}
      />
      <ConfirmDialog />
    </div>
  );
}

function FilterChipsRow({
  title,
  keys,
  active,
  excluded,
  toggle,
  isFirst,
  isLast,
}: {
  title: string;
  keys: readonly string[];
  active: string[];
  excluded: string[];
  toggle: (k: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
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
      {keys.map((k) => {
        const isIncluded = active.includes(k);
        const isExcluded = excluded.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => toggle(k)}
            className={cn(
              "chip cursor-pointer select-none text-[11px] transition-colors",
              isIncluded && "border-primary/60 bg-primary/15 text-foreground",
              isExcluded &&
                "border-danger/60 bg-danger/10 text-danger line-through",
            )}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

function IconBtn({
  onClick,
  children,
  tooltip,
  disabled,
  kind = "default",
}: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
  kind?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 hover:scale-110 hover:bg-black/80 hover:ring-white/40",
        disabled && "opacity-40 cursor-not-allowed hover:scale-100",
        kind === "danger" && "text-danger hover:bg-danger/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function makeMockInstalled(): InstalledWallpaper[] {
  return Array.from({ length: 6 }, (_, i) => ({
    pubfileid: `${2000000 + i}`,
    folder: `/mock/projects/myprojects/${2000000 + i}`,
    project_json_path: `/mock/projects/myprojects/${2000000 + i}/project.json`,
    has_pkg: i % 2 === 0,
    title: `Installed Wallpaper #${i + 1}`,
    preview: "",
    description:
      "Mock description shown when running outside Tauri. Includes more information about the wallpaper.",
    file_type: i % 3 === 0 ? "scene" : i % 3 === 1 ? "video" : "web",
    tags: i % 2 === 0 ? ["Anime", "3D"] : ["Nature", "Abstract"],
    size_bytes: (i + 1) * 30 * 1024 * 1024,
    installed_ts: Date.now() / 1000 - i * 86400,
  }));
}
