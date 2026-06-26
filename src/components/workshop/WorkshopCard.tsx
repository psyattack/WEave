import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import {
  Check,
  Copy,
  Download,
  Eye,
  FolderOpen,
  Layers,
  Package,
  Play,
  Star,
  Trash2,
} from "lucide-react";
import { open as openPath } from "@tauri-apps/plugin-dialog";

import PreviewImage from "@/components/common/PreviewImage";
import { InstalledWallpaper, WorkshopItem } from "@/types/workshop";
import { useAppStore } from "@/stores/app";
import { useInstalledStore } from "@/stores/installed";
import { useTasksStore } from "@/stores/tasks";
import { pushToast } from "@/stores/toasts";
import { inTauri, tryInvoke, tryInvokeOk } from "@/lib/tauri";
import { maybeMinimize } from "@/lib/window";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";

interface Props {
  item: WorkshopItem;
  onOpen: (item: WorkshopItem) => void;
  onDownload: (item: WorkshopItem) => void;
  /** For collections grid: hide the Install button entirely. */
  hideDownload?: boolean;
}

export default function WorkshopCard({
  item,
  onOpen,
  onDownload,
  hideDownload,
}: Props) {
  const { t } = useTranslation();
  const enableLayoutAnimations = useAppStore((s) => s.enableLayoutAnimations);
  const { confirm, ConfirmDialog } = useConfirm();
  const installed = useInstalledStore((s) => s.byId[item.pubfileid]);
  const refreshInstalled = useInstalledStore((s) => s.refresh);
  const addOptimistic = useInstalledStore((s) => s.addOptimistic);
  const removeOptimistic = useInstalledStore((s) => s.removeOptimistic);

  // Local deletion state for smooth UI transition
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset isDeleting when item is no longer installed
  if (isDeleting && !installed) {
    setIsDeleting(false);
  }
  const downloadTask = useTasksStore(
    (s) => s.tasks[`download:${item.pubfileid}`],
  );
  const isDownloading =
    downloadTask &&
    (downloadTask.phase === "starting" || downloadTask.phase === "running");
  const downloadProgress =
    typeof downloadTask?.progress === "number" ? downloadTask.progress : null;

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

  // Installed quick actions — Apply / Extract / Open folder / Delete.
  // These mirror `InstalledView` so a downloaded wallpaper surfaced in
  // Workshop / Collections / Author keeps the same shortcuts on hover
  // instead of a bare "View details" chip.
  const applyInstalled = async (inst: InstalledWallpaper) => {
    if (!inTauri) {
      pushToast(`Apply ${inst.pubfileid}`, "info");
      return;
    }
    const ok = await tryInvokeOk("we_apply", {
      projectPath: inst.project_json_path,
      monitor: null,
      force: false,
    });
    pushToast(
      ok ? t("messages.wallpaper_applied") : t("messages.error"),
      ok ? "success" : "error",
    );
    if (ok) void maybeMinimize();
  };
  const extractInstalled = async (inst: InstalledWallpaper) => {
    if (!inst.has_pkg) {
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
      pubfileid: inst.pubfileid,
      outputDir: folder,
    });
    pushToast(
      ok ? t("messages.extraction_started") : t("messages.error"),
      ok ? "success" : "error",
    );
  };
  const openFolderInstalled = async (inst: InstalledWallpaper) => {
    if (!inTauri) return;
    await tryInvoke("open_path", { path: inst.folder });
  };
  const deleteInstalled = async (inst: InstalledWallpaper) => {
    if (inTauri) {
      const active = await tryInvoke<string[]>(
        "we_active_pubfileids",
        undefined,
        [],
      );
      if ((active ?? []).includes(inst.pubfileid)) {
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

    // Optimistic UI update
    setIsDeleting(true);
    removeOptimistic(inst.pubfileid);

    if (!inTauri) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      setIsDeleting(false);
      return;
    }

    const ok = await tryInvokeOk("we_delete_wallpaper", {
      pubfileid: inst.pubfileid,
    });

    if (ok) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      // Refresh in background to sync state across all views
      void refreshInstalled();
      // State will update when refreshInstalled completes
      // isDeleting will remain true until the card re-renders without installed status
    } else {
      // Rollback on error
      setIsDeleting(false);
      addOptimistic(inst.pubfileid, inst);
      pushToast(
        t("messages.cannot_delete_active_single") ||
          "Wallpaper is currently active — switch first.",
        "error",
      );
    }
  };
  const copyIdInstalled = async (inst: InstalledWallpaper) => {
    await navigator.clipboard.writeText(inst.pubfileid);
    pushToast(t("messages.id_copied"), "success");
  };

  return (
    <>
      <motion.article
        layout={enableLayoutAnimations ? true : false}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={enableLayoutAnimations ? { duration: 0.3, ease: "easeOut" } : { duration: 0.15 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "card card-hover group relative flex flex-col overflow-hidden",
          enableLayoutAnimations
            ? "transition-all duration-300 ease-out"
            : "transition-[border-color,box-shadow] duration-200",
          isDeleting && "pointer-events-none",
        )}
      >
        <div
          className="relative aspect-square w-full overflow-hidden rounded-[inherit] [-webkit-mask-image:-webkit-radial-gradient(white,black)] bg-surface-sunken cursor-pointer"
          onClick={() => onOpen(item)}
        >
          <PreviewImage
            key={item.preview_url}
            src={item.preview_url}
            alt={item.title}
            className={cn(
              "h-full w-full scale-[1.02] object-cover transition-all rounded-[inherit]",
              "duration-700 ease-out group-hover:scale-[1.15] group-hover:brightness-75",
            )}
          />

          {/* Градиентный оверлей для читаемости текста */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70 transition-opacity duration-300",
              "group-hover:opacity-90",
            )}
          />

          {/* Бейджи в верхней части */}
          <div className="absolute left-2 top-2 z-[2] flex items-center gap-2">
            {item.is_collection && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 group-hover:bg-black/85">
                <Layers className="h-3 w-3" />
                {t("labels.collection_badge")}
              </span>
            )}
            {installed && !item.is_collection && (
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/95 text-white shadow-md ring-2 ring-white/30 backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-emerald-400"
                title={t("labels.installed") || "Installed"}
                aria-label={t("labels.installed") || "Installed"}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </div>

          {/* Active-download overlay */}
          {isDownloading && (
            <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white shadow-lg" />
              <div className="text-sm font-bold text-white drop-shadow-lg">
                {downloadProgress != null
                  ? `${Math.round(downloadProgress)}%`
                  : t("labels.downloading") || "Downloading…"}
              </div>
              {downloadProgress != null && (
                <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-white/20 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-white transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, downloadProgress))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Active-deletion overlay */}
          {isDeleting && (
            <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-danger shadow-lg" />
              <div className="text-sm font-bold text-white drop-shadow-lg">
                {t("labels.deleting") || "Deleting…"}
              </div>
            </div>
          )}

          {/* Installed: quick actions */}
          {installed && !item.is_collection && !isDownloading && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] flex items-center pr-2 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
              <div className="pointer-events-auto flex flex-col gap-[0.375rem]">
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void applyInstalled(installed);
                  }}
                  tooltip={t("tooltips.install_wallpaper")}
                >
                  <Play className="h-[1em] w-[1em]" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void extractInstalled(installed);
                  }}
                  tooltip={t("tooltips.extract_wallpaper")}
                  disabled={!installed.has_pkg}
                >
                  <Package className="h-[1em] w-[1em]" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void openFolderInstalled(installed);
                  }}
                  tooltip={t("tooltips.open_folder")}
                >
                  <FolderOpen className="h-[1em] w-[1em]" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyIdInstalled(installed);
                  }}
                  tooltip={t("buttons.copy_id")}
                >
                  <Copy className="h-[1em] w-[1em]" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteInstalled(installed);
                  }}
                  tooltip={t("tooltips.delete_wallpaper")}
                  danger
                >
                  <Trash2 className="h-[1em] w-[1em]" />
                </QuickIcon>
              </div>
            </div>
          )}

          {/* Non-installed: centered hover overlay with Install + Details. */}
          {!(installed && !item.is_collection) && !isDownloading && (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
              <div className="pointer-events-auto flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(item);
                  }}
                  disabled={isDownloading}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground backdrop-blur-sm ring-2 ring-white/20 transition-all duration-200 hover:scale-105",
                    isDownloading && "cursor-not-allowed opacity-60",
                    (hideDownload || item.is_collection) &&
                      "invisible w-0 px-0 gap-0 opacity-0 pointer-events-none",
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("labels.install")}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(item);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/30 transition-all duration-200 hover:scale-105 hover:bg-white/30"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("labels.details")}
                </button>
              </div>
            </div>
          )}

          {/* Название и автор поверх изображения */}
          {!isDownloading && (
            <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-0.5 px-2.5 pb-2.5 pt-6 pr-12">
              <h3
                className="line-clamp-2 text-[13px] font-bold leading-tight text-white drop-shadow-lg"
              >
                {item.title || "—"}
              </h3>
              <div className="flex items-center gap-2 text-[10px]">
                <span
                  className="line-clamp-1 flex-1 font-medium text-white/90 drop-shadow-md"
                >
                  {item.author || "—"}
                </span>
                {item.num_ratings && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 font-semibold text-warning backdrop-blur-sm ring-1 ring-white/20">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    {item.num_ratings}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.article>
      {ConfirmDialog}
    </>
  );
}


function QuickIcon({
  onClick,
  children,
  tooltip,
  disabled,
  danger,
}: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  tooltip: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      className={cn(
        "inline-flex aspect-square w-[clamp(1.75rem,8cqw,2rem)] items-center justify-center rounded-lg bg-black/60 text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 hover:scale-110 hover:bg-black/80 hover:ring-white/40",
        disabled && "opacity-40 cursor-not-allowed hover:scale-100",
        danger && "text-danger hover:bg-danger/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
