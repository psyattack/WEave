import { useRef, useState, useEffect, useMemo } from "react";
import { InstalledWallpaper } from "@/types/workshop";
import { InstalledMetadata } from "@/hooks/useWallpaperActions";
import { useAppStore } from "@/stores/app";
import { motion } from "framer-motion";
import WallpaperCard from "./WallpaperCard";

interface InstalledGridProps {
  items: InstalledWallpaper[];
  selected: InstalledWallpaper | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  setSelected: (item: InstalledWallpaper | null) => void;
  metaMap: Record<string, InstalledMetadata>;
  onApply: (item: InstalledWallpaper) => void;
  onExtract: (item: InstalledWallpaper) => void;
  onDelete: (item: InstalledWallpaper) => void;
  onOpenFolder: (item: InstalledWallpaper) => void;
  onCopyId: (item: InstalledWallpaper) => void;
}

export default function InstalledGrid({
  items,
  selected,
  selectionMode,
  selectedIds,
  toggleSelection,
  setSelected,
  metaMap,
  onApply,
  onExtract,
  onDelete,
  onOpenFolder,
  onCopyId,
}: InstalledGridProps) {
  const enableLayoutAnimations = useAppStore((s) => s.enableLayoutAnimations);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const minColWidth = 190;
  const gap = 12;

  const { cols, colWidth, itemHeight, totalRows, totalHeight } = useMemo(() => {
    const c = dimensions.width === 0 ? 4 : Math.max(1, Math.floor((dimensions.width + gap) / (minColWidth + gap)));
    const cw = dimensions.width === 0 ? minColWidth : (dimensions.width - (c - 1) * gap) / c;
    const ih = cw;
    const tr = Math.ceil(items.length / c);
    const th = tr * ih + (tr > 0 ? (tr - 1) * gap : 0);
    return { cols: c, colWidth: cw, itemHeight: ih, totalRows: tr, totalHeight: th };
  }, [dimensions.width, items.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    const ro = new ResizeObserver(([entry]) => {
      setDimensions((prev) => {
        // Ignore minor height changes (like toolbars expanding/collapsing)
        // to prevent massive layout thrashing and stuttering.
        if (
          prev.width === entry.contentRect.width &&
          Math.abs(prev.height - entry.contentRect.height) < 150
        ) {
          return prev;
        }
        return {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
      });
    });

    el.addEventListener("scroll", handleScroll, { passive: true });
    ro.observe(el);
    setDimensions({ width: el.clientWidth, height: el.clientHeight });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, totalHeight - dimensions.height);
    if (el.scrollTop > maxScroll) {
      try {
        el.scrollTop = maxScroll;
      } catch (e) {
        // JSDOM has read-only scrollTop
      }
      setScrollTop(maxScroll);
    }
  }, [items.length, totalHeight, dimensions.height]);

  const visibleItems = useMemo(() => {
    if (dimensions.height === 0 || items.length === 0) {
      return items.slice(0, 12).map((item, index) => ({ item, index }));
    }
    const buffer = 2;
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - buffer);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + dimensions.height) / (itemHeight + gap)) + buffer
    );

    const result = [];
    const startIndex = startRow * cols;
    const endIndex = Math.min(items.length, endRow * cols);

    for (let i = startIndex; i < endIndex; i++) {
      result.push({ item: items[i], index: i });
    }
    return result;
  }, [items, scrollTop, dimensions.height, cols, totalRows]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto px-4 py-3 relative">
      <div
        style={{
          height: `${totalHeight}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {visibleItems.map(({ item, index }) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const left = col * (colWidth + gap);
          const top = row * (itemHeight + gap);

          return enableLayoutAnimations ? (
            <motion.div
              key={`anim-${item.pubfileid}`}
              initial={false}
              animate={{
                top,
                left,
                width: colWidth,
                height: itemHeight,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "absolute",
              }}
            >
              <WallpaperCard
                item={item}
                index={index}
                isSelected={selected?.pubfileid === item.pubfileid && !selectionMode}
                selectionMode={selectionMode}
                isBulkSelected={selectedIds.has(item.pubfileid)}
                onToggleBulk={() => toggleSelection(item.pubfileid)}
                onSelect={() => setSelected(item)}
                author={metaMap[item.pubfileid]?.author}
                onApply={onApply}
                onExtract={onExtract}
                onDelete={onDelete}
                onOpenFolder={onOpenFolder}
                onCopyId={onCopyId}
              />
            </motion.div>
          ) : (
            <div
              key={`static-${item.pubfileid}`}
              style={{
                position: "absolute",
                top: `${top}px`,
                left: `${left}px`,
                width: `${colWidth}px`,
                height: `${itemHeight}px`,
              }}
            >
              <WallpaperCard
                item={item}
                index={index}
                isSelected={selected?.pubfileid === item.pubfileid && !selectionMode}
                selectionMode={selectionMode}
                isBulkSelected={selectedIds.has(item.pubfileid)}
                onToggleBulk={() => toggleSelection(item.pubfileid)}
                onSelect={() => setSelected(item)}
                author={metaMap[item.pubfileid]?.author}
                onApply={onApply}
                onExtract={onExtract}
                onDelete={onDelete}
                onOpenFolder={onOpenFolder}
                onCopyId={onCopyId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
