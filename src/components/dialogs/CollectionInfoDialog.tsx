import { useTranslation } from "react-i18next";
import { ExternalLink, User } from "lucide-react";
import { openUrl as openExternal } from "@tauri-apps/plugin-opener";

import Dialog from "@/components/common/Dialog";
import PreviewImage from "@/components/common/PreviewImage";
import { useNavStore } from "@/stores/nav";
import { inTauri } from "@/lib/tauri";
import type { CollectionContents } from "@/components/views/CollectionsView";

interface Props {
  open: boolean;
  onClose: () => void;
  collection: CollectionContents | null;
}

/**
 * Replicates the Python `CollectionInfoDialog`: clicking the collection
 * title in the header brings up its preview, author and description.
 * Items count is also useful here so the user doesn't have to look at the
 * grid count separately.
 */
export default function CollectionInfoDialog({
  open,
  onClose,
  collection,
}: Props) {
  const { t } = useTranslation();
  const openAuthor = useNavStore((s) => s.openAuthor);

  if (!collection) return null;

  const openWorkshop = async () => {
    const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${collection.collection_id}`;
    if (inTauri) await openExternal(url);
    else window.open(url, "_blank");
  };

  const goAuthor = () => {
    if (!collection.author_url) return;
    openAuthor(collection.author_url, collection.author);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={collection.title || t("labels.collections")}
      size="md"
    >
      <div className="flex flex-col gap-3 text-sm">
        {collection.preview_url && (
          <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken">
            <PreviewImage
              src={collection.preview_url}
              alt={collection.title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {collection.author && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-surface-raised disabled:opacity-60"
              disabled={!collection.author_url}
              onClick={goAuthor}
            >
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="text-subtle">
                {t("labels.author", { author: "" }).replace(/:$/, "")}:{" "}
                <span className="font-semibold text-foreground">
                  {collection.author}
                </span>
              </span>
            </button>
          )}
          <span className="rounded-md bg-surface-sunken px-2 py-1 text-xs text-subtle">
            {t("labels.items_count", { count: collection.items.length })}
          </span>
          <button
            type="button"
            onClick={openWorkshop}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1 text-xs font-semibold hover:bg-surface-raised"
          >
            <ExternalLink className="h-3 w-3" />
            {t("buttons.open_workshop")}
          </button>
        </div>
        {collection.description ? (
          <div className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-sunken p-3 text-xs leading-relaxed">
            {collection.description}
          </div>
        ) : (
          <div className="text-xs text-subtle">
            {t("labels.no_description")}
          </div>
        )}
      </div>
    </Dialog>
  );
}
