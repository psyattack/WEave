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
  const { confirm, ConfirmDialog } = useConfirm();
  const installed = useInstalledStore((s) => s.byId[item.pubfileid]);
  const refreshInstalled = useInstalledStore((s) => s.refresh);
  const downloadTask = useTasksStore(
    (s) => s.tasks[`download:${item.pubfileid}`],
  );
  const isDownloading =
    downloadTask &&
    (downloadTask.phase === "starting" || downloadTask.phase === "running");
  const downloadProgress =
    typeof downloadTask?.progress === "number" ? downloadTask.progress : null;

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
    if (!inTauri) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      return;
    }
    const ok = await tryInvokeOk("we_delete_wallpaper", {
      pubfileid: inst.pubfileid,
    });
    if (ok) {
      pushToast(t("messages.wallpaper_deleted"), "success");
      await refreshInstalled();
    } else {
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
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "card card-hover group relative flex flex-col overflow-hidden",
          isDownloading && "pointer-events-none",
        )}
      >
        <div
          className="relative aspect-square w-full overflow-hidden bg-surface-sunken cursor-pointer"
          onClick={() => onOpen(item)}
        >
          <PreviewImage
            key={item.preview_url}
            src={item.preview_url}
            alt={item.title}
            className={cn(
              "h-full w-full scale-[1.02] object-cover transition-all",
              !isDownloading &&
                "duration-700 ease-out group-hover:scale-[1.15] group-hover:brightness-75",
            )}
          />

          {/* Градиентный оверлей для читаемости текста */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-70 transition-opacity duration-300",
              !isDownloading && "group-hover:opacity-90",
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

          {/* Installed: quick actions */}
          {installed && !item.is_collection && !isDownloading && (
            <div className="pointer-events-none absolute right-2 top-2 z-[2] flex flex-col gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
              <div className="pointer-events-auto flex flex-col gap-1.5">
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void applyInstalled(installed);
                  }}
                  tooltip={t("tooltips.install_wallpaper")}
                >
                  <Play className="h-3.5 w-3.5" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void extractInstalled(installed);
                  }}
                  tooltip={t("tooltips.extract_wallpaper")}
                  disabled={!installed.has_pkg}
                >
                  <Package className="h-3.5 w-3.5" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void openFolderInstalled(installed);
                  }}
                  tooltip={t("tooltips.open_folder")}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyIdInstalled(installed);
                  }}
                  tooltip={t("buttons.copy_id")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </QuickIcon>
                <QuickIcon
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteInstalled(installed);
                  }}
                  tooltip={t("tooltips.delete_wallpaper")}
                  danger
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </QuickIcon>
              </div>
            </div>
          )}

          {/* Non-installed: centered hover overlay with Install + Details. */}
          {!(installed && !item.is_collection) && !isDownloading && (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
              <div className="pointer-events-auto flex items-center gap-2 translate-y-3 transition-transform duration-300 group-hover:translate-y-0">
                {!hideDownload && !item.is_collection && (
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
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {t("labels.install")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(item);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md ring-1 ring-white/30 transition-all duration-200 hover:scale-105 hover:bg-white/20"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t("labels.details")}
                </button>
              </div>
            </div>
          )}

          {/* Название и автор поверх изображения */}
          <div className="absolute bottom-0 left-0 right-0 z-[1] flex flex-col gap-0.5 px-2.5 pb-2.5 pt-6 pr-12 transition-all duration-300">
            <h3
              className="line-clamp-2 text-[13px] font-bold leading-tight text-white drop-shadow-lg transition-all duration-300 group-hover:translate-y-[-2px]"
              title={item.title}
            >
              {item.title || "—"}
            </h3>
            <div className="flex items-center gap-2 text-[10px] transition-all duration-300 group-hover:translate-y-[-2px]">
              <span
                className="line-clamp-1 flex-1 font-medium text-white/90 drop-shadow-md"
                title={item.author || ""}
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
        </div>
      </motion.article>
      <ConfirmDialog />
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
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 hover:scale-110 hover:bg-black/80 hover:ring-white/40",
        disabled && "opacity-40 cursor-not-allowed hover:scale-100",
        danger && "text-danger hover:bg-danger/80 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
