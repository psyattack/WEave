
import {
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Package,
  Play,
  Trash2,
  MoreHorizontal,
  MonitorPlay,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { open as openPath } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "@/i18n/hooks";
import { inTauri, tryInvokeOk } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { maybeMinimize } from "@/lib/window";
import { useConfirm } from "@/hooks/useConfirm";
import { Tooltip } from "@/components/common/Tooltip";
import { Meta } from "@/hooks/useDetailsMeta";
import { InstalledWallpaper, WorkshopItem } from "@/types/workshop";

interface DetailsActionButtonsProps {
  kind: "workshop" | "installed";
  item: WorkshopItem | InstalledWallpaper | null;
  meta: Meta;
  installedEntry: InstalledWallpaper | undefined;
  showInstalledActions: boolean;
  openWorkshopPage: () => Promise<void>;
  refreshInstalled: () => Promise<void>;
  removeOptimistic: (pubfileid: string) => void;
  addOptimistic: (pubfileid: string, wallpaper: InstalledWallpaper) => void;
  onClose: () => void;
  onDownload?: (item: WorkshopItem) => void;
  onApply?: (item: InstalledWallpaper) => void;
  onExtract?: (item: InstalledWallpaper) => void;
  onDelete?: (item: InstalledWallpaper) => void;
  onOpenFolder?: (item: InstalledWallpaper) => void;
}

async function pickDir(): Promise<string | null> {
  if (!inTauri) return null;
  const r = await openPath({ directory: true });
  if (!r || Array.isArray(r)) return null;
  return r;
}

export default function DetailsActionButtons({
  kind,
  item,
  meta,
  installedEntry,
  showInstalledActions,
  openWorkshopPage,
  refreshInstalled,
  removeOptimistic,
  addOptimistic,
  onClose,
  onDownload,
  onApply,
  onExtract,
  onDelete,
  onOpenFolder,
}: DetailsActionButtonsProps) {
  const { t } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();

  const installedHandle: InstalledWallpaper | null =
    kind === "installed"
      ? (item as InstalledWallpaper | null)
      : (installedEntry ?? null);

  const overlayApply = async () => {
    if (!installedHandle) return;
    const ok = await tryInvokeOk("we_apply", {
      projectPath: installedHandle.project_json_path,
      monitor: null,
      force: false,
    });
    if (ok) {
      pushToast(t("messages.applied") || "Applied", "success");
      void maybeMinimize();
    } else {
      pushToast(t("messages.apply_failed") || "Apply failed", "error");
    }
  };

  const overlayOpenWe = async () => {
    await tryInvokeOk("we_open", { show_window: true });
    void maybeMinimize();
  };

  const overlayExtract = async () => {
    if (!installedHandle) return;
    if (!installedHandle.has_pkg) {
      pushToast(t("messages.no_pkg_file") || "No .pkg file", "warning");
      return;
    }
    const folder = await pickDir();
    if (!folder) return;
    const ok = await tryInvokeOk("extract_start", {
      pubfileid: installedHandle.pubfileid,
      outputDir: folder,
    });
    pushToast(
      ok
        ? t("messages.extraction_started") || "Extract started"
        : t("messages.error") || "Extract failed",
      ok ? "success" : "error",
    );
  };

  const overlayOpenFolder = async () => {
    if (!installedHandle) return;
    await tryInvokeOk("open_path", { path: installedHandle.folder });
  };

  const overlayDelete = async () => {
    if (!installedHandle) return;
    if (inTauri) {
      const activeIds = await tryInvokeOk("we_active_pubfileids") as unknown as string[] || [];
      if (activeIds.includes(installedHandle.pubfileid)) {
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

    removeOptimistic(installedHandle.pubfileid);
    onClose();

    const ok = await tryInvokeOk("we_delete_wallpaper", {
      pubfileid: installedHandle.pubfileid,
    });

    if (ok) {
      pushToast(t("messages.deleted") || "Deleted", "success");
      void refreshInstalled();
    } else {
      addOptimistic(installedHandle.pubfileid, installedHandle);
      pushToast(
        t("messages.cannot_delete_active_single") ||
          t("messages.delete_failed") ||
          "Delete failed",
        "error",
      );
    }
  };

  const copyIdHandle = installedHandle || (kind === "workshop" ? item : null);

  return (
    <>
      <div className="flex w-full items-center gap-1.5">
        {/* Primary Action */}
        <div className="flex-1">
          {showInstalledActions && installedHandle ? (
            <button
              onClick={() =>
                kind === "installed" && onApply
                  ? onApply(installedHandle)
                  : void overlayApply()
              }
              className="hover-shimmer w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-semibold text-sm transition-colors shadow-lg"
            >
              <Play className="h-4 w-4" />
              {t("tooltips.install_wallpaper")}
            </button>
          ) : kind === "workshop" ? (
            <button
              disabled={meta.is_collection}
              onClick={() => {
                if (item && onDownload) {
                  onDownload(item as WorkshopItem);
                  onClose();
                }
              }}
              className="hover-shimmer w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 shadow-lg"
            >
              <Download className="h-4 w-4" />
              {t("buttons.install")}
            </button>
          ) : (
            <div className="w-full" />
          )}
        </div>

        {showInstalledActions && installedHandle && (
          <Tooltip content={t("tooltips.open_we") || "Open in WE"} side="top">
            <button
              onClick={() => void overlayOpenWe()}
              aria-label="Open in Wallpaper Engine"
              className="hover-shimmer flex items-center justify-center h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 text-foreground transition-colors"
            >
              <MonitorPlay className="h-4 w-4" />
            </button>
          </Tooltip>
        )}

        {showInstalledActions && installedHandle && (
          <Tooltip content={t("tooltips.extract_wallpaper")} side="top">
            <button
              disabled={!meta.has_pkg}
              onClick={() =>
                kind === "installed" && onExtract
                  ? onExtract(installedHandle)
                  : void overlayExtract()
              }
              aria-label="Extract"
              className="hover-shimmer flex items-center justify-center h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 text-foreground transition-colors disabled:opacity-50"
            >
              <Package className="h-4 w-4" />
            </button>
          </Tooltip>
        )}



        {/* Dropdown Menu (Extra / Danger) */}
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label="More options"
              className="hover-shimmer flex items-center justify-center h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 text-foreground transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-[160px] rounded-md bg-black/40 backdrop-blur-xl border border-white/10 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95"
            >
              <DropdownMenu.Item
                onClick={() => void openWorkshopPage()}
                className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-white/10 rounded-sm"
              >
                <ExternalLink className="h-4 w-4" />
                {t("buttons.open_workshop")}
              </DropdownMenu.Item>

              {showInstalledActions && installedHandle && (
                <DropdownMenu.Item
                  onClick={() =>
                    kind === "installed" && onOpenFolder
                      ? onOpenFolder(installedHandle)
                      : void overlayOpenFolder()
                  }
                  className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-white/10 rounded-sm"
                >
                  <FolderOpen className="h-4 w-4" />
                  {t("tooltips.open_folder")}
                </DropdownMenu.Item>
              )}

              {copyIdHandle && (
                <DropdownMenu.Item
                  onClick={async () => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      await navigator.clipboard.writeText(copyIdHandle.pubfileid);
                      pushToast(t("messages.copied") || "Copied", "success");
                    }
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-white/10 rounded-sm"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </DropdownMenu.Item>
              )}
              {showInstalledActions && installedHandle && (
                <>
                  <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
                  <DropdownMenu.Item
                    onClick={() =>
                      kind === "installed" && onDelete
                        ? onDelete(installedHandle)
                        : void overlayDelete()
                    }
                    className="flex items-center gap-2 px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-danger/20 text-danger rounded-sm focus:bg-danger/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("tooltips.delete_wallpaper")}
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {ConfirmDialog}
    </>
  );
}
