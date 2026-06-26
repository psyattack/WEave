import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import { ArrowLeft, Info, Layers } from "lucide-react";

import WorkshopCard from "@/components/workshop/WorkshopCard";
import FilterBar from "@/components/workshop/FilterBar";
import DetailsPanel from "@/components/common/DetailsPanel";
import Pagination from "@/components/workshop/Pagination";
import { SkeletonCard } from "@/components/common/Skeleton";
import CollectionInfoDialog from "@/components/dialogs/CollectionInfoDialog";
import { useFiltersStore } from "@/stores/filters";
import { useRefreshStore } from "@/stores/refresh";
import { useAppStore } from "@/stores/app";
import { useNavStore } from "@/stores/nav";
import { pushToast } from "@/stores/toasts";
import { useSteamSessionStore } from "@/stores/steam-session";
import { usePaginationContext } from "@/hooks/usePaginationContext";
import { inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import type { WorkshopFilters } from "@/stores/filters";
import { WorkshopItem, WorkshopPage } from "@/types/workshop";

interface CollectionInfo {
  rating_star_file?: string;
  num_ratings?: string;
  item_count?: number;
  unique_visitors?: string;
  subscribers?: string;
  favorited?: string;
  total_favorited?: string;
  posted_date?: string;
  updated_date?: string;
  [key: string]: string | number | undefined;
}

export interface CollectionContents {
  collection_id: string;
  title: string;
  description: string;
  preview_url: string;
  author: string;
  author_url: string;
  items: WorkshopItem[];
  related_collections?: WorkshopItem[];
  info?: CollectionInfo;
}

export default function CollectionsView() {
  const { t } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const setPage = useFiltersStore((s) => s.setPage);
  const setViewPage = useFiltersStore((s) => s.setViewPage);
  const getViewPage = useFiltersStore((s) => s.getViewPage);
  const accountIndex = useAppStore((s) => s.accountIndex);
  const sub = useNavStore((s) => s.sub);
  const navBack = useNavStore((s) => s.back);
  const steamPhase = useSteamSessionStore((s) => s.phase);
  const [page, setPageData] = useState<WorkshopPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorkshopItem | null>(null);
  const [prevSub, setPrevSub] = useState(sub);
  const [requestedCollectionId, setRequestedCollectionId] = useState<string | null>(
    sub.kind === "collection" ? sub.collectionId : null
  );
  const [prevRequestedCollectionId, setPrevRequestedCollectionId] = useState<string | null>(
    sub.kind === "collection" ? sub.collectionId : null
  );

  const [opened, setOpened] = useState<CollectionContents | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  if (sub !== prevSub) {
    setPrevSub(sub);
    const nextId = sub.kind === "collection" ? sub.collectionId : null;
    setRequestedCollectionId(nextId);
  }

  if (requestedCollectionId !== prevRequestedCollectionId) {
    setPrevRequestedCollectionId(requestedCollectionId);
    if (!requestedCollectionId) {
      setOpened(null);
      setShowInfo(false);
    }
  }

  // Get the saved page for this collection or main collections view
  const currentPage = requestedCollectionId
    ? getViewPage("collection", requestedCollectionId)
    : getViewPage("collections");

  // Sync filters.page with the view-specific page
  useEffect(() => {
    if (filters.page !== currentPage) {
      setPage(currentPage);
    }
  }, [requestedCollectionId, currentPage, filters.page, setPage]);

  const filtersKey = useMemo(
    () => JSON.stringify({ f: filters, c: requestedCollectionId }),
    [filters, requestedCollectionId],
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (requestedCollectionId) {
      void (async () => {
        if (!inTauri) {
          setOpened({
            collection_id: requestedCollectionId,
            title: sub.kind === "collection" ? (sub.title ?? "Collection") : "",
            description: "",
            preview_url: "",
            author: "",
            author_url: "",
            items: [],
          });
          return;
        }
        const c = await tryInvoke<CollectionContents>(
          "workshop_get_collection",
          { collectionId: requestedCollectionId },
        );
        if (c) setOpened(c);
      })();
    }
  }, [requestedCollectionId, sub]);

  const refreshCounter = useRefreshStore((s) => s.counter);
  const cacheRef = useRef<Map<string, WorkshopPage>>(new Map());

  useEffect(() => {
    cacheRef.current.clear();
  }, [refreshCounter]);

  useEffect(() => {
    // Reset scroll to top when page changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [filters.page]);

  useEffect(() => {
    if (requestedCollectionId) return;
    let active = true;
    const t = setTimeout(() => {
      if (inTauri && (steamPhase === "idle" || steamPhase === "logging-in")) {
        setLoading(true);
        return;
      }

      const cached = cacheRef.current.get(filtersKey);
      if (cached) {
        setPageData(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      void (async () => {
        if (!inTauri) {
          setPageData(makeMockPage(filters.page));
          setLoading(false);
          return;
        }
        if (refreshCounter > 0) {
          await tryInvokeOk("workshop_refresh_cache");
        }
        let result = cached;
        if (!result) {
          result =
            (await tryInvoke<WorkshopPage>("workshop_browse_collections", {
              filters,
            })) ?? undefined;
          if (result) cacheRef.current.set(filtersKey, result);
        }
        if (!active) return;
        setPageData(result ?? null);
        setLoading(false);

        if (result && result.total_pages > filters.page) {
          const preloadOn = await tryInvoke<boolean>(
            "config_get",
            { path: "settings.general.behavior.preload_next_page" },
            true,
          );
          if (preloadOn === false) return;
          const nextFilters: WorkshopFilters = {
            ...filters,
            page: filters.page + 1,
          };
          const nextKey = JSON.stringify({
            f: nextFilters,
            c: requestedCollectionId,
          });
          if (!cacheRef.current.has(nextKey)) {
            void tryInvoke<WorkshopPage>("workshop_browse_collections", {
              filters: nextFilters,
            }).then((next) => {
              if (next) cacheRef.current.set(nextKey, next);
            });
          }
        }
      })();
    }, 0);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filtersKey, filters, requestedCollectionId, refreshCounter, steamPhase]);

  const items = page?.items ?? [];
  const total = page?.total_items ?? 0;
  const totalPages = page?.total_pages ?? 1;

  // Publish pagination context for hotkeys.
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (requestedCollectionId) {
      setViewPage("collection", newPage, requestedCollectionId);
    } else {
      setViewPage("collections", newPage);
    }
  };
  usePaginationContext({
    view: requestedCollectionId
      ? `collection:${requestedCollectionId}`
      : "collections",
    page: filters.page,
    totalPages,
    onPageChange: handlePageChange,
  });

  const openCollection = async (item: WorkshopItem) => {
    if (!inTauri) {
      setOpened({
        collection_id: item.pubfileid,
        title: item.title,
        description: "",
        preview_url: item.preview_url,
        author: item.author,
        author_url: item.author_url,
        items: [],
      });
      return;
    }
    const c = await tryInvoke<CollectionContents>("workshop_get_collection", {
      collectionId: item.pubfileid,
    });
    if (c) setOpened(c);
  };

  const handleDownload = async (item: WorkshopItem) => {
    if (item.is_collection) {
      await openCollection(item);
      return;
    }
    if (!inTauri) {
      pushToast(t("messages.download_started"), "success");
      return;
    }
    const ok = await tryInvokeOk("download_start", {
      pubfileid: item.pubfileid,
      accountIndex,
    });

    if (ok) {
      pushToast(t("messages.download_started"), "success");
    } else {
      pushToast(t("messages.error"), "error");
    }
  };

  if (opened) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-4 py-3">
          <button
            className="btn-ghost"
            onClick={() => {
              if (requestedCollectionId) navBack();
              else setOpened(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("labels.back")}
          </button>
          <Layers className="h-4 w-4 text-primary" />
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium hover:bg-surface-raised"
            title={t("labels.collection_info") || "Collection info"}
          >
            {opened.title}
            <Info className="h-3 w-3 text-subtle" />
          </button>
          <span className="text-xs text-subtle">
            {t("labels.items_count", { count: opened.items.length })}
          </span>
        </div>
        <CollectionVirtualGrid
          items={opened.items}
          onOpen={setSelected}
          onDownload={handleDownload}
          emptyLabel={t("labels.no_wallpapers_found")}
        />
        <DetailsPanel
          kind="workshop"
          item={selected}
          onClose={() => setSelected(null)}
          onDownload={handleDownload}
        />
        <CollectionInfoDialog
          open={showInfo}
          onClose={() => setShowInfo(false)}
          collection={opened}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* No "Collections" header here — the user is already on the
          Collections tab; restating it adds nothing. */}
      <FilterBar />

      <div ref={scrollContainerRef} className="flex-1 overflow-auto px-4 py-3">
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {Array.from({ length: 30 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            {t("labels.no_collections_found")}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
              {items.map((item) => (
                <WorkshopCard
                  key={item.pubfileid}
                  item={{ ...item, is_collection: true }}
                  onOpen={openCollection}
                  onDownload={openCollection}
                  hideDownload
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        onChange={(newPage) => {
          setPage(newPage);
          if (requestedCollectionId) {
            setViewPage("collection", newPage, requestedCollectionId);
          } else {
            setViewPage("collections", newPage);
          }
        }}
        infoText={
          total
            ? t("labels.showing_collections", {
                start: (filters.page - 1) * 30 + 1,
                end: (filters.page - 1) * 30 + items.length,
                total,
              })
            : ""
        }
      />
      <DetailsPanel
        kind="workshop"
        item={selected}
        onClose={() => setSelected(null)}
        onDownload={handleDownload}
      />
    </div>
  );
}

function makeMockPage(page: number): WorkshopPage {
  const items: WorkshopItem[] = Array.from({ length: 30 }, (_, i) => ({
    pubfileid: `${500000 + (page - 1) * 30 + i}`,
    title: `Mock Collection #${(page - 1) * 30 + i + 1}`,
    preview_url: "",
    author: "Author",
    author_url: "",
    description: "",
    file_size: "",
    posted_date: "",
    updated_date: "",
    tags: [],
    rating_star_file: "",
    num_ratings: "",
    is_collection: true,
  }));
  return {
    items,
    total_items: 120,
    total_pages: 5,
    current_page: page,
  };
}

// ─── Inline virtual grid for opened collection ────────────────────────────────
// Lives here to avoid the forwardRef/ref complications that broke other views.

interface CollectionVirtualGridProps {
  items: WorkshopItem[];
  onOpen: (item: WorkshopItem) => void;
  onDownload: (item: WorkshopItem) => Promise<void>;
  emptyLabel: string;
}

function CollectionVirtualGrid({
  items,
  onOpen,
  onDownload,
  emptyLabel,
}: CollectionVirtualGridProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const minColWidth = 190;
  const gap = 12;

  const { cols, colWidth, itemHeight, totalRows, totalHeight } = useMemo(() => {
    const c =
      dimensions.width === 0
        ? 4
        : Math.max(1, Math.floor((dimensions.width + gap) / (minColWidth + gap)));
    const cw =
      dimensions.width === 0
        ? minColWidth
        : (dimensions.width - (c - 1) * gap) / c;
    const ih = cw;
    const tr = Math.ceil(items.length / c);
    const th = tr * ih + (tr > 0 ? (tr - 1) * gap : 0);
    return { cols: c, colWidth: cw, itemHeight: ih, totalRows: tr, totalHeight: th };
  }, [dimensions.width, items.length]);

  useEffect(() => {
    if (!container) return;

    const onScroll = () => setScrollTop(container.scrollTop);
    const ro = new ResizeObserver(([entry]) => {
      setDimensions((prev) => {
        const { width, height } = entry.contentRect;
        if (prev.width === width && prev.height !== 0 && Math.abs(prev.height - height) < 150)
          return prev;
        return { width, height };
      });
    });

    container.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(container);
    
    const animId = requestAnimationFrame(() => {
      setDimensions({ width: container.clientWidth, height: container.clientHeight });
    });

    return () => {
      container.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(animId);
    };
  }, [container]);

  const visibleItems = useMemo(() => {
    if (items.length === 0) return [];
    if (dimensions.height === 0) return items.slice(0, 12).map((item, index) => ({ item, index }));

    const buffer = 2;
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - buffer);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + dimensions.height) / (itemHeight + gap)) + buffer,
    );

    const result: { item: WorkshopItem; index: number }[] = [];
    for (let i = startRow * cols; i < Math.min(items.length, endRow * cols); i++) {
      result.push({ item: items[i], index: i });
    }
    return result;
  }, [items, scrollTop, dimensions.height, cols, itemHeight, totalRows]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex h-64 items-center justify-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div ref={setContainer} className="flex-1 overflow-auto px-4 py-3 relative">
      <div style={{ height: `${totalHeight}px`, width: "100%", position: "relative" }}>
        {visibleItems.map(({ item, index }) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          return (
            <div
              key={item.pubfileid}
              style={{
                position: "absolute",
                top: `${row * (itemHeight + gap)}px`,
                left: `${col * (colWidth + gap)}px`,
                width: `${colWidth}px`,
                height: `${itemHeight}px`,
              }}
            >
              <WorkshopCard
                item={item}
                onOpen={onOpen}
                onDownload={onDownload}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
