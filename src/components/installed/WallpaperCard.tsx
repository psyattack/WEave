import React from "react";
import { useTranslation } from "@/i18n/hooks";
import { Check, Copy, FolderOpen, Package, Play, Trash2 } from "lucide-react";
import PreviewImage from "@/components/common/PreviewImage";
import { InstalledWallpaper } from "@/types/workshop";
import { cn, formatBytes } from "@/lib/utils";
import { useAppStore } from "@/stores/app";

interface WallpaperCardProps {
  item: InstalledWallpaper;
  isSelected: boolean;
  selectionMode: boolean;
  isBulkSelected: boolean;
  onToggleBulk: () => void;
  onSelect: () => void;
  author?: string;
  onApply: (item: InstalledWallpaper) => void;
  onExtract: (item: InstalledWallpaper) => void;
  onDelete: (item: InstalledWallpaper) => void;
  onOpenFolder: (item: InstalledWallpaper) => void;
  onCopyId: (item: InstalledWallpaper) => void;
  index?: number;
}

export default function WallpaperCard({
  item,
  isSelected,
  selectionMode,
  isBulkSelected,
  onToggleBulk,
  onSelect,
  author,
  onApply,
  onExtract,
  onDelete,
  onOpenFolder,
  onCopyId,
  index = 0,
}: WallpaperCardProps) {
  const { t } = useTranslation();
  const enableLayoutAnimations = useAppStore((s) => s.enableLayoutAnimations);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const appState = useAppStore.getState();
    const lowPerf = appState.lowPerformance;
    const enable3d = appState.enable3dCards;
    if (reduceMotion || lowPerf || !enable3d) {
      return;
    }

    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width || 200;
    const height = rect.height || 250;
    const x = e.clientX - (rect.left || 0);
    const y = e.clientY - (rect.top || 0);
    const centerX = width / 2;
    const centerY = height / 2;
    const rotateX = ((y - centerY) / centerY) * -15; // Max 15 degrees tilt
    const rotateY = ((x - centerX) / centerX) * 15;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  };

  return (
    <article
      onClick={() => {
        if (selectionMode) {
          onToggleBulk();
        } else {
          onSelect();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
      className={cn(
        "card card-hover group relative flex cursor-pointer flex-col overflow-hidden",
        enableLayoutAnimations
          ? "transition-all duration-300 ease-out"
          : "transition-[border-color,box-shadow] duration-200",
        isSelected && !selectionMode && "ring-2 ring-primary/70",
        selectionMode && isBulkSelected && "ring-2 ring-primary",
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[inherit] bg-surface-sunken [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
        <PreviewImage
          key={item.preview}
          src={item.preview}
          alt={item.title}
          className="size-full scale-[1.02] rounded-[inherit] object-cover transition-all duration-700 ease-out group-hover:scale-[1.15] group-hover:brightness-75"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-90" />

        {/* Checkbox for bulk actions */}
        {selectionMode && (
          <div className="absolute top-2 right-2 z-3">
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded border-2 transition-all",
                isBulkSelected
                  ? "border-primary bg-primary"
                  : "border-white/40 bg-black/40 backdrop-blur-sm",
              )}
            >
              {isBulkSelected && <Check className="size-3.5 text-white" />}
            </div>
          </div>
        )}

        {/* File size */}
        <div className="absolute top-1.5 left-2 z-2">
          <span className="inline-flex items-center rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-sm">
            {formatBytes(item.size_bytes)}
          </span>
        </div>

        {/* Quick Actions */}
        {!selectionMode && (
          <div className="absolute inset-y-0 right-0 z-2 flex translate-x-2 items-center pr-2 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            <div className="flex flex-col gap-1.5">
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(item);
                }}
                tooltip={t("tooltips.install_wallpaper")}
              >
                <Play className="size-[1em]" />
              </IconBtn>
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  onExtract(item);
                }}
                tooltip={t("tooltips.extract_wallpaper")}
                disabled={!item.has_pkg}
              >
                <Package className="size-[1em]" />
              </IconBtn>
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFolder(item);
                }}
                tooltip={t("tooltips.open_folder")}
              >
                <FolderOpen className="size-[1em]" />
              </IconBtn>
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyId(item);
                }}
                tooltip={t("buttons.copy_id")}
              >
                <Copy className="size-[1em]" />
              </IconBtn>
              <IconBtn
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
                tooltip={t("tooltips.delete_wallpaper")}
                kind="danger"
              >
                <Trash2 className="size-[1em]" />
              </IconBtn>
            </div>
          </div>
        )}

        {/* Title and author overlay */}
        <div className="absolute inset-x-0 bottom-0 z-1 flex flex-col gap-0.5 px-2.5 pt-6 pr-12 pb-2.5">
          <h3
            className="line-clamp-2 text-[13px] leading-tight font-bold text-white drop-shadow-lg"
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <span
              className="line-clamp-1 flex-1 font-medium text-white/90 drop-shadow-md"
            >
              {author || "—"}
            </span>
          </div>
        </div>
      </div>
    </article>
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
        "inline-flex aspect-square w-[clamp(1.75rem,8cqw,2rem)] items-center justify-center rounded-lg bg-black/60 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/80 hover:ring-white/40",
        disabled && "cursor-not-allowed opacity-40 hover:scale-100",
        kind === "danger" && "text-danger hover:bg-danger/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
