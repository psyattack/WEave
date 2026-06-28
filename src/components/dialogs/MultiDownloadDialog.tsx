import { useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { Download, FileText, AlertCircle, ListPlus, Inbox } from "lucide-react";
import { clsx } from "clsx";

import Dialog from "@/components/common/Dialog";
import { inTauri, tryInvokeAction } from "@/lib/tauri";
import { extractWorkshopIds } from "@/lib/workshop";
import { pushToast } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MultiDownloadDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const accountIndex = useAppStore((s) => s.accountIndex);
  const [text, setText] = useState("");
  const ids = extractWorkshopIds(text);

  const handleStart = async () => {
    if (ids.length === 0) {
      pushToast(t("messages.invalid_input"), "error");
      return;
    }
    if (!inTauri) {
      pushToast(t("messages.download_started"), "success");
      onOpenChange(false);
      return;
    }
    const res = await tryInvokeAction("download_multi_start", {
      pubfileids: ids,
      accountIndex,
    });
    pushToast(
      res.ok
        ? t("labels.started_n_downloads", { count: ids.length })
        : `${t("messages.error") || "Error"}: ${res.error}`,
      res.ok ? "success" : "error",
    );
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <ListPlus size={18} className="text-primary" />
          <span>{t("tooltips.multi_download") || "Multi Download"}</span>
        </div>
      }
      size="lg"
      footer={
        <div className="flex w-full items-center justify-end">
          <button
            className={clsx(
              "flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all duration-200",
              ids.length > 0
                ? "cursor-pointer bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(var(--primary),0.5)]"
                : "cursor-not-allowed bg-white/5 text-muted"
            )}
            onClick={handleStart}
            disabled={ids.length === 0}
          >
            <Download size={16} />
            {t("buttons.start_install")}
          </button>
        </div>
      }
    >
      <div className="grid h-100 gap-5 md:grid-cols-2">
        {/* Left panel: Input */}
        <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-colors duration-300 focus-within:border-primary/30">
          <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 p-3 text-sm font-medium">
            <FileText size={16} className="text-primary opacity-80" />
            <span>{t("labels.input_links") || "Paste Links or IDs"}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="custom-scrollbar flex-1 resize-none bg-transparent p-4 font-mono text-sm text-foreground/90 outline-none placeholder:text-muted/40"
            placeholder={t("messages.batch_input_placeholder")}
            spellCheck={false}
          />
        </div>

        {/* Right panel: Preview */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 p-3 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Inbox size={16} className="text-primary opacity-80" />
              <span>{t("labels.detected_preview") || "Detected Preview"}</span>
            </div>
            {ids.length > 0 && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-xs text-primary">
                {ids.length}
              </span>
            )}
          </div>
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            {ids.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-muted">
                <div className="rounded-full bg-white/5 p-4">
                  <AlertCircle size={32} className="opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/70">
                    {t("labels.waiting_for_input") || "Waiting for input"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap content-start gap-2">
                {ids.map((id, index) => (
                  <div
                    key={`${id}-${index}`}
                    className="group inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-xs transition-colors hover:border-primary/50 hover:bg-primary/10"
                  >
                    <span className="text-muted transition-colors select-all group-hover:text-primary">
                      {id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
