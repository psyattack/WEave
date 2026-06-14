import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer rounded-md bg-surface-raised/70", className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden relative">
      <div className="relative aspect-square w-full">
        <Skeleton className="h-full w-full" />

        {/* Градиентный оверлей */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70" />

        {/* Текст поверх изображения */}
        <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-0.5 px-2.5 pb-2.5 pt-6 pr-12">
          <Skeleton className="h-[13px] w-3/4 bg-white/20" />
          <Skeleton className="h-[10px] w-1/2 bg-white/15" />
        </div>
      </div>
    </div>
  );
}
