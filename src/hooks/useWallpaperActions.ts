import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { open as openPath } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "@/stores/app";
import { useInstalledStore } from "@/stores/installed";
import { useTasksStore } from "@/stores/tasks";
import { inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { maybeMinimize } from "@/lib/window";
import { pushToast } from "@/stores/toasts";
import { useRefreshStore } from "@/stores/refresh";
import { InstalledWallpaper } from "@/types/workshop";
import { extractTagLabel, parseRatingStars } from "@/lib/workshop";
import {
  MISC_TAG_KEYS,
  GENRE_TAG_KEYS,
  type LocalSortKey,
} from "@/lib/filterConfig";
import { useConfirm } from "@/hooks/useConfirm";
import { useMetadataInitStore } from "@/stores/metadata-init";

export interface InstalledMetadata {
  tags?: unknown[];
  rating_star_file?: string;
  posted_date?: string;
  updated_date?: string;
  author?: string;
}

export function useWallpaperActions() {
  const { t } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const weDirectory = useAppStore((s) => s.weDirectory);
  const refreshInstalledGlobal = useInstalledStore((s) => s.refresh);
  const installedUpdateCounter = useInstalledStore((s) => s.updateCounter);

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
  const [excludedAuthorFilters, setExcludedAuthorFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<LocalSortKey>("install_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selected, setSelected] = useState<InstalledWallpaper | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [metaMap, setMetaMap] = useState<Record<string, InstalledMetadata>>({});
  const downloadTasks = useTasksStore((s) => s.tasks);

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

  useEffect(() => {
    if (installedUpdateCounter > 0) {
      void refresh();
    }
  }, [installedUpdateCounter]);

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

  const visibleAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    for (const item of items) {
      const author = metaMap[item.pubfileid]?.author;
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

    const downloadingIds = new Set(
      Object.entries(downloadTasks)
        .filter(
          ([key, task]) =>
            key.startsWith("download:") &&
            (task.phase === "starting" || task.phase === "running"),
        )
        .map(([key]) => key.replace("download:", "")),
    );

    let result = items.filter((item) => {
      if (downloadingIds.has(item.pubfileid)) return false;

      if (q) {
        const inTitle = item.title.toLowerCase().includes(q);
        const inId = item.pubfileid.includes(q);
        if (!inTitle && !inId) return false;
      }
      const has = tagsFor(item);
      if (category && !has.has(category)) return false;
      if (typeFilter) {
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
      if (authorFilters.length > 0 || excludedAuthorFilters.length > 0) {
        const author = metaMap[item.pubfileid]?.author?.trim() || "";
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
        default:
          return 0;
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
    downloadTasks,
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

    const previousItems = items;
    setItems((prev) => prev.filter((i) => i.pubfileid !== item.pubfileid));
    setSelected(null);

    if (!inTauri) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      return;
    }

    const ok = await tryInvokeOk("we_delete_wallpaper", {
      pubfileid: item.pubfileid,
    });

    if (ok) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      void refresh();
      void refreshInstalledGlobal();
    } else {
      setItems(previousItems);
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
          t("messages.bulk_delete_with_active", {
            count: activeInSelection.length,
          }),
          "error",
        );
        return;
      }
    }

    const confirmed = await confirm({
      title: t("buttons.delete"),
      message: t("messages.confirm_bulk_delete", { count: selectedIds.size }),
      confirmLabel: t("buttons.delete") || "Delete",
      cancelLabel: t("buttons.cancel") || "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;

    const previousItems = items;
    const toDelete = selectedIds;
    setItems((prev) => prev.filter((i) => !toDelete.has(i.pubfileid)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setSelected(null);

    if (!inTauri) {
      pushToast(
        t("messages.bulk_delete_success", { count: toDelete.size }),
        "success",
      );
      return;
    }

    // Run parallel using Promise.all
    const results = await Promise.all(
      Array.from(toDelete).map((pubfileid) =>
        tryInvokeOk("we_delete_wallpaper", { pubfileid })
      )
    );
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      pushToast(
        t("messages.bulk_delete_success", { count: successCount }),
        "success",
      );
      void refresh();
      void refreshInstalledGlobal();
    } else {
      setItems(previousItems);
      pushToast(t("messages.bulk_delete_success", { count: 0 }), "error");
    }
  };

  const handleBulkExtract = async () => {
    if (selectedIds.size === 0) return;

    const selectedItems = items.filter((item) =>
      selectedIds.has(item.pubfileid),
    );
    const withPkg = selectedItems.filter((item) => item.has_pkg);

    if (withPkg.length === 0) {
      pushToast(t("messages.no_pkg_file"), "warning");
      return;
    }

    if (!inTauri) {
      pushToast(
        t("messages.bulk_extract_success", { count: withPkg.length }),
        "success",
      );
      return;
    }

    const folder = await openPath({ directory: true });
    if (!folder || Array.isArray(folder)) return;

    // Run parallel using Promise.all
    const results = await Promise.all(
      withPkg.map((item) =>
        tryInvokeOk("extract_start", {
          pubfileid: item.pubfileid,
          outputDir: folder,
        })
      )
    );
    const successCount = results.filter(Boolean).length;

    pushToast(
      t("messages.bulk_extract_success", { count: successCount }),
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

      void refresh();
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

  const activeFiltersCount = [
    category !== "",
    typeFilter !== "",
    age !== "",
    resolution !== "",
    tagFilters.length > 0,
    excludedTagFilters.length > 0,
  ].filter(Boolean).length;

  return {
    items,
    setItems,
    loading,
    search,
    setSearch,
    category,
    setCategory,
    typeFilter,
    setTypeFilter,
    age,
    setAge,
    resolution,
    setResolution,
    tagFilters,
    setTagFilters,
    excludedTagFilters,
    setExcludedTagFilters,
    authorFilters,
    setAuthorFilters,
    excludedAuthorFilters,
    setExcludedAuthorFilters,
    sort,
    setSort,
    sortOrder,
    setSortOrder,
    showAdvanced,
    setShowAdvanced,
    selected,
    setSelected,
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    metaMap,
    refresh,
    handleApply,
    handleDelete,
    handleBulkDelete,
    handleBulkExtract,
    toggleSelection,
    selectAll,
    clearSelection,
    handleExtract,
    handleOpenFolder,
    handleCopyId,
    handleInitMetadata,
    toggleTag,
    toggleAuthor,
    filtered,
    tagsFor,
    metaFor,
    presentTags,
    visibleMiscTags,
    visibleGenreTags,
    visibleAuthors,
    totalSize,
    hasActiveFilters,
    hasAnyExtraTags,
    activeFiltersCount,
    ConfirmDialog,
  };
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
