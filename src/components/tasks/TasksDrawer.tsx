import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  MinusCircle,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

import Drawer from "@/components/common/Drawer";
import PreviewImage from "@/components/common/PreviewImage";
import * as Progress from "@radix-ui/react-progress";
import { inTauri, tryInvoke, tryInvokeAction } from "@/lib/tauri";
import { TaskStatus, useTasksStore } from "@/stores/tasks";
import { useInstalledStore } from "@/stores/installed";
import { useAppStore } from "@/stores/app";
import { pushToast, dismissAllToasts } from "@/stores/toasts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TasksDrawer({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const tasks = useTasksStore((s) => s.tasks);
  const history = useTasksStore((s) => s.history);
  const clearFinished = useTasksStore((s) => s.clearFinished);

  const active = Object.values(tasks);
  const accountIndex = useAppStore((s) => s.accountIndex);

  useEffect(() => {
    if (open) {
      dismissAllToasts();
    }
  }, [open]);

  const handleRetry = async (task: TaskStatus) => {
    if (!inTauri) return;
    if (task.kind === "download") {
      const res = await tryInvokeAction("download_start", {
        pubfileid: task.pubfileid,
        accountIndex,
      });
      if (res.ok) pushToast(t("messages.download_started"), "success");
      else pushToast(`${t("messages.error") || "Error"}: ${res.error}`, "error");
    } else if (task.kind === "extract") {
      const res = await tryInvokeAction("pkg_extract", {
        pubfileid: task.pubfileid,
      });
      if (res.ok) pushToast(t("messages.extraction_started") || "Extraction started!", "success");
      else pushToast(`${t("messages.error") || "Error"}: ${res.error}`, "error");
    }
  };

  const handleCancel = async (task: TaskStatus) => {
    if (!inTauri) return;
    if (task.kind === "download") {
      try {
        await invoke("download_cancel", {
          pubfileid: task.pubfileid,
        });
      } catch (err) {
        console.error("download_cancel error:", err);
      }
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={t("tooltips.tasks")}
      width="380px"
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto p-3">
          {active.length === 0 && history.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted">
              {t("labels.no_tasks")}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {active.map((task) => (
                  <motion.div
                    key={`${task.kind}-${task.pubfileid}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-3 shadow-lg backdrop-blur-md"
                  >
                    <TaskPreview pubfileid={task.pubfileid} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {task.kind === "download" ? (
                            <Download className="size-4 text-primary" />
                          ) : (
                            <FileArchive className="size-4 text-info" />
                          )}
                          {t(
                            task.kind === "download"
                              ? "labels.download_prefix"
                              : "labels.extract_prefix",
                          )}
                          : {task.pubfileid}
                        </div>
                        <button
                          className="btn-icon"
                          onClick={() => handleCancel(task)}
                          title={t("tooltips.cancel_task")}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Loader2 className="size-3 animate-spin" />
                        <span className="line-clamp-1">{task.status}</span>
                      </div>
                      {task.progress != null && task.progress > 0 && (
                        <Progress.Root
                          value={task.progress}
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                        >
                          <Progress.Indicator
                            style={{
                              transform: `translateX(-${100 - task.progress}%)`,
                              transition: "transform 240ms",
                            }}
                            className="size-full bg-primary"
                          />
                        </Progress.Root>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {history.length > 0 && (
                <div className="mt-2 text-[11px] tracking-wide text-subtle uppercase">
                  {t("labels.tasks_history")}
                </div>
              )}
              {history.map((task, i) => (
                <div
                  key={`${task.kind}-${task.pubfileid}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-2 text-xs text-muted backdrop-blur-sm"
                >
                  <TaskPreview pubfileid={task.pubfileid} small />
                  {task.phase === "completed" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : task.phase === "cancelled" ? (
                    <MinusCircle className="size-4 shrink-0 text-warning" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-foreground">
                      {task.kind === "download"
                        ? t("labels.download_prefix")
                        : t("labels.extract_prefix")}
                      : {task.pubfileid}
                    </div>
                    <div className="truncate">
                      {task.phase === "cancelled"
                        ? t("labels.task_cancelled")
                        : task.status}
                    </div>
                  </div>
                  {task.phase === "failed" && (
                    <button
                      type="button"
                      onClick={() => void handleRetry(task)}
                      className="ml-auto inline-flex items-center justify-center rounded-md p-1.5 text-muted hover:bg-surface-raised hover:text-foreground"
                      title={t("buttons.retry")}
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="border-t border-border p-3">
            <button className="btn-ghost w-full" onClick={clearFinished}>
              {t("tooltips.clear_history")}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/**
 * Small thumbnail for task rows. Resolves the preview URL through:
 *   1. The locally-installed cache (after the download finishes the
 *      file is on disk, so the path is immediately available).
 *   2. The Steam metadata cache (`metadata_get`) — populated by the
 *      original parser whenever we've seen this pubfileid.
 *   3. A live `workshop_get_item` fetch as a last resort.
 */
function TaskPreview({
  pubfileid,
  small,
}: {
  pubfileid: string;
  small?: boolean;
}) {
  const installed = useInstalledStore((s) => s.byId[pubfileid]);
  const [prevPubfileid, setPrevPubfileid] = useState(pubfileid);
  const [prevInstalledPreview, setPrevInstalledPreview] = useState<string | undefined>(installed?.preview);
  const [src, setSrc] = useState<string>(installed?.preview || "");

  if (pubfileid !== prevPubfileid || installed?.preview !== prevInstalledPreview) {
    setPrevPubfileid(pubfileid);
    setPrevInstalledPreview(installed?.preview);
    setSrc(installed?.preview || "");
  }

  useEffect(() => {
    if (installed?.preview) return;
    if (!inTauri) return;
    let cancelled = false;
    void (async () => {
      const cached = await tryInvoke<{ preview?: string } | null>(
        "metadata_get",
        { pubfileid },
      );
      if (!cancelled && cached?.preview) {
        setSrc(cached.preview);
        return;
      }
      const remote = await tryInvoke<{ preview_url?: string } | null>(
        "workshop_get_item",
        { pubfileid },
      );
      if (!cancelled && remote?.preview_url) setSrc(remote.preview_url);
    })();
    return () => {
      cancelled = true;
    };
  }, [pubfileid, installed]);

  const dim = small ? "h-10 w-10" : "h-16 w-16";
  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-md border border-white/10 bg-surface-sunken/50`}
    >
      {src ? (
        <PreviewImage
          key={src}
          src={src}
          alt={pubfileid}
          className="size-full object-cover"
        />
      ) : null}
    </div>
  );
}
