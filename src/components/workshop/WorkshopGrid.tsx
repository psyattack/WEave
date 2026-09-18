import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/app";
import { WorkshopItem } from "@/types/workshop";

interface WorkshopGridProps {
  items: WorkshopItem[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  renderItem: (item: WorkshopItem, index: number) => React.ReactNode;
}

export default function WorkshopGrid({
  items,
  containerRef,
  renderItem,
}: WorkshopGridProps) {
  const enableLayoutAnimations = useAppStore((s) => s.enableLayoutAnimations);
  const [width, setWidth] = useState(0);

  const minColWidth = 190;
  const gap = 12;

  const { cols, colWidth, itemHeight, totalHeight } = useMemo(() => {
    const c =
      width === 0
        ? 4
        : Math.max(1, Math.floor((width + gap) / (minColWidth + gap)));
    const cw = width === 0 ? minColWidth : (width - (c - 1) * gap) / c;
    const ih = cw;
    const tr = Math.ceil(items.length / c);
    const th = tr * ih + (tr > 0 ? (tr - 1) * gap : 0);
    return {
      cols: c,
      colWidth: cw,
      itemHeight: ih,
      totalHeight: th,
    };
  }, [width, items.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) {
        setWidth(w);
      }
    });

    ro.observe(el);
    const computed = window.getComputedStyle(el);
    const paddingX =
      (parseFloat(computed.paddingLeft) || 0) +
      (parseFloat(computed.paddingRight) || 0);
    const initialWidth = el.clientWidth - paddingX;
    if (initialWidth > 0) {
      setWidth(initialWidth);
    }

    return () => ro.disconnect();
  }, [containerRef]);

  if (!enableLayoutAnimations) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${totalHeight}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {items.map((item, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const left = col * (colWidth + gap);
        const top = row * (itemHeight + gap);

        return (
          <motion.div
            key={item.pubfileid}
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
            {renderItem(item, index)}
          </motion.div>
        );
      })}
    </div>
  );
}
