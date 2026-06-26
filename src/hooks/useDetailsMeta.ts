import React, { useEffect, useMemo, useState, ReactNode } from "react";
import { useTranslation } from "@/i18n/hooks";
import { openUrl as openExternal } from "@tauri-apps/plugin-opener";
import {
  CollectionRef,
  InstalledWallpaper,
  RawTag,
  WorkshopItem,
} from "@/types/workshop";
import { inTauri, tryInvoke, tryInvokeAction, invoke } from "@/lib/tauri";
import { useNavStore } from "@/stores/nav";
import { useInstalledStore } from "@/stores/installed";
import { formatBytes, formatTimestamp } from "@/lib/utils";
import { groupTags, parseRatingStars, workshopUrl } from "@/lib/workshop";
import { pushToast } from "@/stores/toasts";
import { useAppStore } from "@/stores/app";

type DetailsKind = "workshop" | "installed";

export type MetaRow =
  | [string, string | ReactNode]
  | [string, string | ReactNode, "warning"];

export interface Meta {
  pubfileid: string;
  title: string;
  preview: string;
  description: string;
  author?: string;
  author_url?: string;
  posted_date?: string;
  updated_date?: string;
  num_ratings?: string;
  rating_star_file?: string;
  file_size?: string;
  tags?: RawTag[];
  collections?: CollectionRef[];
  file_type?: string;
  size_bytes?: number;
  installed_ts?: number;
  has_pkg?: boolean;
  is_collection?: boolean;
}

function hasMergeValue(value: Meta[keyof Meta] | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function mergeMeta(root: Meta, fresh: Partial<Meta>): Meta {
  return {
    ...root,
    pubfileid: hasMergeValue(fresh.pubfileid) ? fresh.pubfileid! : root.pubfileid,
    title: hasMergeValue(fresh.title) ? fresh.title! : root.title,
    preview: hasMergeValue(fresh.preview) ? fresh.preview! : root.preview,
    description: hasMergeValue(fresh.description) ? fresh.description! : root.description,
    author: hasMergeValue(fresh.author) ? fresh.author : root.author,
    author_url: hasMergeValue(fresh.author_url) ? fresh.author_url : root.author_url,
    posted_date: hasMergeValue(fresh.posted_date) ? fresh.posted_date : root.posted_date,
    updated_date: hasMergeValue(fresh.updated_date) ? fresh.updated_date : root.updated_date,
    num_ratings: hasMergeValue(fresh.num_ratings) ? fresh.num_ratings : root.num_ratings,
    rating_star_file: hasMergeValue(fresh.rating_star_file) ? fresh.rating_star_file : root.rating_star_file,
    file_size: hasMergeValue(fresh.file_size) ? fresh.file_size : root.file_size,
    tags: hasMergeValue(fresh.tags) ? fresh.tags : root.tags,
    collections: hasMergeValue(fresh.collections) ? fresh.collections : root.collections,
    file_type: hasMergeValue(fresh.file_type) ? fresh.file_type : root.file_type,
    size_bytes: hasMergeValue(fresh.size_bytes) ? fresh.size_bytes : root.size_bytes,
    installed_ts: hasMergeValue(fresh.installed_ts) ? fresh.installed_ts : root.installed_ts,
    has_pkg: hasMergeValue(fresh.has_pkg) ? fresh.has_pkg : root.has_pkg,
    is_collection: hasMergeValue(fresh.is_collection) ? fresh.is_collection : root.is_collection,
  };
}

function workshopToMeta(w: WorkshopItem): Meta {
  return {
    pubfileid: w.pubfileid,
    title: w.title,
    preview: w.preview_url,
    description: w.description,
    author: w.author,
    author_url: w.author_url,
    posted_date: w.posted_date,
    updated_date: w.updated_date,
    num_ratings: w.num_ratings,
    rating_star_file: w.rating_star_file,
    file_size: w.file_size,
    tags: Array.isArray(w.tags) ? w.tags : [],
    collections: w.collections,
    is_collection: w.is_collection,
  };
}

function installedToMeta(i: InstalledWallpaper): Meta {
  return {
    pubfileid: i.pubfileid,
    title: i.title,
    preview: i.preview,
    description: i.description,
    file_type: i.file_type,
    size_bytes: i.size_bytes,
    installed_ts: i.installed_ts,
    has_pkg: i.has_pkg,
    tags: i.tags,
  };
}

interface UseDetailsMetaProps {
  kind: DetailsKind;
  item: WorkshopItem | InstalledWallpaper | null;
  onClose: () => void;
}

export function useDetailsMeta({ kind, item, onClose }: UseDetailsMetaProps) {
  const { t, i18n } = useTranslation();
  const openAuthor = useNavStore((s) => s.openAuthor);
  const openCollection = useNavStore((s) => s.openCollection);
  const refreshInstalled = useInstalledStore((s) => s.refresh);
  const removeOptimistic = useInstalledStore((s) => s.removeOptimistic);
  const addOptimistic = useInstalledStore((s) => s.addOptimistic);

  const installedEntry = useInstalledStore((s) =>
    item ? s.byId[item.pubfileid] : undefined
  );
  const showInstalledActions = kind === "installed" || Boolean(installedEntry);

  // FIX: Wrap baseMeta in useMemo to prevent redundant calculations on every render
  const baseMeta: Meta | null = useMemo(() => {
    if (!item) return null;
    return kind === "workshop"
      ? workshopToMeta(item as WorkshopItem)
      : installedToMeta(item as InstalledWallpaper);
  }, [item, kind]);

  const augmentedBase: Meta | null = useMemo(() => {
    if (!baseMeta) return null;
    if (kind === "installed") return baseMeta;
    if (!installedEntry) return baseMeta;
    return {
      ...baseMeta,
      file_type: installedEntry.file_type,
      size_bytes: installedEntry.size_bytes,
      installed_ts: installedEntry.installed_ts,
      has_pkg: installedEntry.has_pkg,
      title: baseMeta.title || installedEntry.title,
      preview: baseMeta.preview || installedEntry.preview,
      description: baseMeta.description || installedEntry.description,
      tags:
        baseMeta.tags && baseMeta.tags.length > 0
          ? baseMeta.tags
          : installedEntry.tags,
    };
  }, [baseMeta, installedEntry, kind]);

  const [fresh, setFresh] = useState<Partial<Meta> | null>(null);
  const [translated, setTranslated] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const pubfileid = item?.pubfileid ?? null;
  const [prevPubfileid, setPrevPubfileid] = useState<string | null>(pubfileid);

  if (pubfileid !== prevPubfileid) {
    setPrevPubfileid(pubfileid);
    setFresh(null);
    setTranslated("");
    setShowTranslation(false);
    setRateLimited(false);
  }

  useEffect(() => {
    if (!pubfileid || !inTauri) return;
    let cancelled = false;
    void (async () => {
      if (kind === "installed") {
        const saved = await tryInvoke<Partial<Meta> | null>("metadata_get", {
          pubfileid,
        });
        if (!cancelled && saved) setFresh(saved);
      }
      try {
        const remote = await invoke<Partial<Meta>>("workshop_get_item", {
          pubfileid,
        });
        if (!cancelled && remote) setFresh(remote);
      } catch (err: any) {
        if (String(err).includes("429") || (err instanceof Error && err.message.includes("429"))) {
          setRateLimited(true);
        } else {
          console.warn(`invoke workshop_get_item failed`, err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pubfileid, kind]);

  const meta: Meta | null = useMemo(() => {
    const root = augmentedBase;
    if (!root) return null;
    if (!fresh) return root;
    return mergeMeta(root, fresh);
  }, [augmentedBase, fresh]);

  const groupedTags = useMemo(
    () => groupTags(meta?.tags, t("labels.tags") || "Tags"),
    [meta?.tags, t]
  );

  const description = meta?.description ?? "";
  const displayedDescription =
    showTranslation && translated ? translated : description;

  const openWorkshopPage = async () => {
    if (!meta) return;
    const url = workshopUrl(meta.pubfileid);
    if (inTauri) await openExternal(url);
    else window.open(url, "_blank");
  };

  const handleTranslate = async () => {
    if (!description) return;
    if (translated) {
      setShowTranslation((v) => !v);
      return;
    }
    if (!inTauri) return;
    setTranslating(true);
    try {
      const res = await tryInvokeAction<string>("translator_translate", {
        text: description,
        sourceLang: "auto",
        targetLang: i18n.language || "en",
      });
      if (res.ok && res.value) {
        setTranslated(res.value);
        setShowTranslation(true);
      } else {
        const errorMsg = !res.ok ? res.error : "Unknown error";
        pushToast(`${t("messages.translation_error") || "Translation failed"}: ${errorMsg}`, "error");
      }
    } finally {
      setTranslating(false);
    }
  };

  const goToAuthor = () => {
    if (!meta?.author_url) return;
    openAuthor(meta.author_url, meta.author || "");
    onClose();
  };

  const goToCollection = (c: CollectionRef) => {
    openCollection(c.id, c.title);
    onClose();
  };

  const datesAndStats: MetaRow[] = useMemo(() => {
    const rows: MetaRow[] = [];
    if (meta) {
      if (showInstalledActions) {
        rows.push([
          t("labels.size", { size: "" }).replace(/:$/, ""),
          meta.size_bytes ? formatBytes(meta.size_bytes) : meta.file_size || "—",
        ]);
        if (meta.installed_ts) {
          rows.push([
            t("labels.installed") || "Installed",
            formatTimestamp(meta.installed_ts),
          ]);
        }
      } else if (meta.file_size) {
        rows.push([
          t("labels.size", { size: "" }).replace(/:$/, ""),
          meta.file_size,
        ]);
      }
      if (meta.posted_date) {
        rows.push([
          t("labels.posted", { date: "" }).replace(/:$/, ""),
          meta.posted_date,
        ]);
      }
      if (meta.updated_date) {
        rows.push([
          t("labels.updated", { date: "" }).replace(/:$/, ""),
          meta.updated_date,
        ]);
      }
      const ratingStars = parseRatingStars(meta.rating_star_file);
      const votes = (meta.num_ratings || "").trim();
      if (ratingStars > 0 || votes) {
        const filled = "★".repeat(ratingStars);
        const empty = "☆".repeat(Math.max(0, 5 - ratingStars));
        rows.push([
          t("labels.rating") || "Rating",
          React.createElement(
            "span",
            { className: "flex items-center" },
            React.createElement("span", { className: "text-warning" }, filled),
            React.createElement("span", { className: "text-warning/30" }, empty),
            votes
              ? React.createElement(
                  "span",
                  { className: "ml-1 text-foreground" },
                  `(${votes})`
                )
              : null
          ),
          "warning",
        ]);
      }
    }
    return rows;
  }, [meta, showInstalledActions, t]);

  useEffect(() => {
    const store = useAppStore.getState();
    store.setActiveDetailsCover(meta?.preview || null);
    return () => {
      store.setActiveDetailsCover(null);
    };
  }, [meta?.preview]);

  return {
    meta,
    rateLimited,
    fresh,
    translated,
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
  };
}
