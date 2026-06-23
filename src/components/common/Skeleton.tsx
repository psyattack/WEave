import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isRtl, setIsRtl] = React.useState(() => {
    if (typeof document !== "undefined") {
      return document.querySelector('[dir="rtl"]') !== null || document.documentElement.dir === "rtl";
    }
    return false;
  });

  React.useLayoutEffect(() => {
    if (ref.current) {
      const closestDir = ref.current.closest("[dir]");
      const dir = closestDir ? closestDir.getAttribute("dir") : document.documentElement.dir;
      setIsRtl(dir === "rtl");
    }
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "shimmer rounded-md bg-surface-raised/70",
        isRtl && "bg-gradient-to-l",
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden relative">
      <div className="relative aspect-square w-full">
        <Skeleton className="h-full w-full" />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70" />

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-0.5 px-2.5 pb-2.5 pt-6 pr-12">
          <Skeleton className="h-[13px] w-3/4 bg-white/20" />
          <Skeleton className="h-[10px] w-1/2 bg-white/15" />
        </div>
      </div>
    </div>
  );
}
