import { useState, useEffect } from "react";
import { Languages, User } from "lucide-react";
import { useTranslation } from "@/i18n/hooks";
import { motion } from "framer-motion";

import Drawer from "@/components/common/Drawer";
import PreviewImage from "@/components/common/PreviewImage";
import DetailsActionButtons from "./DetailsActionButtons";
import DetailsMetaGrid from "./DetailsMetaGrid";
import { useDetailsMeta, } from "@/hooks/useDetailsMeta";
import { InstalledWallpaper, WorkshopItem } from "@/types/workshop";
import { translateTagCategory, translateTagValue } from "@/lib/filterConfig";
import { Tooltip } from "@/components/common/Tooltip";
import { useAppStore } from "@/stores/app";
import { dismissAllToasts } from "@/stores/toasts";

interface CommonProps {
  onClose: () => void;
}

interface WorkshopProps extends CommonProps {
  kind: "workshop";
  item: WorkshopItem | null;
  onDownload: (item: WorkshopItem) => void;
}

interface InstalledProps extends CommonProps {
  kind: "installed";
  item: InstalledWallpaper | null;
  onApply: (item: InstalledWallpaper) => void;
  onExtract: (item: InstalledWallpaper) => void;
  onDelete: (item: InstalledWallpaper) => void;
  onOpenFolder: (item: InstalledWallpaper) => void;
  onCopyId: (item: InstalledWallpaper) => void;
}

type DetailsSidebarProps = WorkshopProps | InstalledProps;

function ExpandableDescription({ text, noDescText }: { text: string, noDescText: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text && text.length > 150 || text.split("\n").length > 3;

  return (
    <div className="flex flex-col gap-1 w-full">
      <motion.div 
        animate={{ height: expanded ? "auto" : (isLong ? 60 : "auto") }}
        className="overflow-hidden relative w-full"
      >
        <div className="text-[13px] text-white/50 italic leading-relaxed whitespace-pre-wrap pr-2 pb-1">
          {text || noDescText}
        </div>
      </motion.div>
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] uppercase font-semibold tracking-wider text-primary hover:text-primary-muted self-start mt-1"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export default function DetailsSidebar(props: DetailsSidebarProps) {
  const { t, i18n } = useTranslation();
  const setDetailsOpen = useAppStore((s) => s.setDetailsOpen);
  
  useEffect(() => {
    const isOpen = !!props.item;
    setDetailsOpen(isOpen);
    if (isOpen) {
      dismissAllToasts();
    }
    return () => {
      setDetailsOpen(false);
    };
  }, [!!props.item, setDetailsOpen]);

  const {
    meta,
    rateLimited,
    showTranslation,
    translating,
    description,
    displayedDescription,
    handleTranslate,
    goToAuthor,
    goToCollection,
    datesAndStats,
    groupedTags,
    installedEntry,
    showInstalledActions,
    openWorkshopPage,
    refreshInstalled,
    removeOptimistic,
    addOptimistic,
  } = useDetailsMeta({
    kind: props.kind,
    item: props.item,
    onClose: props.onClose,
  });

  return (
    <Drawer
      open={!!props.item}
      onOpenChange={(o) => !o && props.onClose()}
      title={meta?.title ?? ""}
      width="min(340px, 92vw)"
    >
      {meta && (
        <div className="flex flex-col gap-2.5 p-3 text-[13px]">
          {rateLimited && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning-foreground">
              {t("metadata_init.rate_limit_error") ||
                "Rate limit exceeded. Please try again in a few minutes."}
            </div>
          )}
          <div className="overflow-hidden rounded-md border border-white/5 bg-white/5 backdrop-blur-md shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]">
            <PreviewImage
              key={meta.preview}
              src={meta.preview}
              alt={meta.title}
              className="aspect-square w-full object-cover"
            />
          </div>

          <DetailsActionButtons
            kind={props.kind}
            item={props.item}
            meta={meta}
            installedEntry={installedEntry}
            showInstalledActions={showInstalledActions}
            openWorkshopPage={openWorkshopPage}
            refreshInstalled={refreshInstalled}
            removeOptimistic={removeOptimistic}
            addOptimistic={addOptimistic}
            onClose={props.onClose}
            onDownload={props.kind === "workshop" ? props.onDownload : undefined}
            onApply={props.kind === "installed" ? props.onApply : undefined}
            onExtract={props.kind === "installed" ? props.onExtract : undefined}
            onDelete={props.kind === "installed" ? props.onDelete : undefined}
            onOpenFolder={props.kind === "installed" ? props.onOpenFolder : undefined}
          />

          <div className="flex flex-col gap-1">
            {meta.author && (
              <button
                type="button"
                onClick={goToAuthor}
                disabled={!meta.author_url}
                className="hover-shimmer flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/5 px-2.5 py-1.5 hover:bg-white/10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]"
              >
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="text-white/70">
                    {t("labels.author", { author: "" })}{" "}
                    <span className="font-semibold text-foreground">
                      {meta.author}
                    </span>
                  </span>
                </div>
              </button>
            )}

            <DetailsMetaGrid 
              rows={datesAndStats}
            />
          </div>

          {groupedTags.length > 0 && (
            <div className="flex flex-col gap-1">
              {groupedTags.map((g) => (
                <div key={g.category}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                    {translateTagCategory(g.category, i18n)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.values.map((v, i) => (
                      <button
                        key={`${v}-${i}`}
                        className="hover-shimmer rounded-full border border-white/5 bg-white/5 px-3.5 py-1 text-xs text-white/90 hover:bg-white/10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]"
                      >
                        {translateTagValue(v, g.category, i18n)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta.collections && meta.collections.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                {t("labels.collections") || "Collections"}
              </div>
              <div className="flex flex-col gap-1">
                {meta.collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => goToCollection(c)}
                    className="hover-shimmer flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/5 px-2.5 py-1.5 text-left hover:bg-white/10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]"
                  >
                    <span className="line-clamp-1 text-xs font-medium text-foreground/90">
                      {c.title}
                    </span>
                    {c.item_count > 0 && (
                      <span className="shrink-0 text-[11px] text-white/50">
                        {c.item_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                {t("labels.description")}
              </span>
              <div className="flex items-center gap-0.5">
                <Tooltip content={translating ? t("labels.translating") : (showTranslation ? t("tooltips.show_original") : t("tooltips.translate_description"))} side="top">
                  <button
                    type="button"
                    aria-label="Translate"
                    className="hover-shimmer inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-50 transition-colors"
                    onClick={handleTranslate}
                    disabled={!description || translating}
                  >
                    <Languages className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
            <ExpandableDescription 
              text={displayedDescription} 
              noDescText={t("labels.no_description") || "No description"} 
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
