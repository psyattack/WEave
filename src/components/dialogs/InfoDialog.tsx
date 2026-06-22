import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/hooks";
import { openUrl as openExternal } from "@tauri-apps/plugin-opener";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderOpen,
  Github,
  Loader2,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

import Dialog from "@/components/common/Dialog";
import Markdown from "@/components/common/Markdown";
import { inTauri, invoke, tryInvoke } from "@/lib/tauri";
import AppIcon from "@/components/common/AppIcon";

interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at?: string;
  prerelease?: boolean;
}

const RELEASES_URL = "https://api.github.com/repos/psyattack/WEave/releases";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckUpdates?: () => void;
  onOpenLegal?: () => void;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        type="button" 
        className="w-full flex items-center justify-between text-left py-2.5 text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="pr-4">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 opacity-50" /> : <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
      </button>
      {open && (
        <div className="pb-3 text-xs text-muted whitespace-pre-wrap leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

const TOOLS: { label: string; url: string; license?: string }[] = [
  { label: "Tauri", url: "https://v2.tauri.app/", license: "MIT/Apache-2.0" },
  { label: "React", url: "https://react.dev/", license: "MIT" },
  {
    label: "DepotDownloaderMod",
    url: "https://github.com/SteamAutoCracks/DepotDownloaderMod",
    license: "GPL-2.0",
  },
  {
    label: "RePKG",
    url: "https://github.com/notscuffed/repkg",
    license: "MIT",
  },
];

export default function InfoDialog({
  open,
  onOpenChange,
  onCheckUpdates,
  onOpenLegal,
}: Props) {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string>(__APP_VERSION__);
  const [dataDir, setDataDir] = useState<string>("");
  const [showChangelog, setShowChangelog] = useState(false);
  const [releases, setReleases] = useState<GithubRelease[] | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  useEffect(() => {
    if (!open || !inTauri) return;
    void tryInvoke<{ version: string; name: string }>("app_get_info").then(
      (v) => {
        if (v?.version) setVersion(v.version);
      },
    );
    void tryInvoke<string>("app_get_data_dir", undefined, "").then((p) => {
      if (p) setDataDir(p);
    });
  }, [open]);

  // Reset the changelog on every open so stale data from a previous
  // session (e.g. a network hiccup) doesn't stick around.
  useEffect(() => {
    if (!open) {
      setShowChangelog(false);
      setShowFaq(false);
      setChangelogError(null);
    }
  }, [open]);

  const loadReleases = async () => {
    setLoadingReleases(true);
    setChangelogError(null);
    try {
      const res = await fetch(RELEASES_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) {
        throw new Error(`GitHub API ${res.status}`);
      }
      const data = (await res.json()) as GithubRelease[];
      const list = Array.isArray(data) ? data : [];
      setReleases(list);
      if (list.length > 0 && !selectedTag) {
        setSelectedTag(list[0].tag_name);
      }
    } catch (err) {
      setChangelogError(
        err instanceof Error ? err.message : String(err ?? "unknown error"),
      );
    } finally {
      setLoadingReleases(false);
    }
  };

  const toggleChangelog = () => {
    const next = !showChangelog;
    setShowChangelog(next);
    if (next && showFaq) setShowFaq(false);
    if (next && !releases && !loadingReleases) {
      void loadReleases();
    }
  };

  const toggleFaq = () => {
    const next = !showFaq;
    setShowFaq(next);
    if (next && showChangelog) setShowChangelog(false);
  };

  const selectedRelease =
    releases?.find((r) => r.tag_name === selectedTag) ?? null;

  const openLink = async (url: string) => {
    if (inTauri) await openExternal(url);
    else window.open(url, "_blank");
  };

  const openDataFolder = async () => {
    if (!inTauri) return;
    await invoke("app_open_data_dir").catch(() => undefined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialog.about")}
      size="sm"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <AppIcon className="h-32 w-32" />
        <div className="space-y-1">
          <div className="text-lg font-semibold">{t("info.app_full_name")}</div>
          <div className="text-xs text-muted">
            {t("info.version_label")}{" "}
            <span className="text-foreground">{version || "—"}</span>
          </div>
        </div>
        <p className="text-sm text-muted">{t("info.description")}</p>
        <p className="text-xs text-subtle">{t("info.developed")}</p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={() => openLink("https://github.com/psyattack/WEave")}
          >
            <Github className="h-4 w-4" />
            {t("buttons.github")}
          </button>
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={() => {
              if (onCheckUpdates) {
                onOpenChange(false);
                onCheckUpdates();
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            {t("buttons.check_updates")}
          </button>
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={openDataFolder}
            disabled={!inTauri}
            title={dataDir}
          >
            <FolderOpen className="h-4 w-4" />
            {t("buttons.open_data_folder")}
          </button>
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={toggleChangelog}
            aria-expanded={showChangelog}
          >
            <BookOpen className="h-4 w-4" />
            {t("buttons.changelog") || "Changelog"}
            {showChangelog ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={toggleFaq}
            aria-expanded={showFaq}
          >
            <HelpCircle className="h-4 w-4" />
            {t("buttons.faq") || "FAQ"}
            {showFaq ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            className="hover-shimmer px-3 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-md border border-white/10 text-sm flex items-center gap-2 transition-all"
            onClick={() => {
              if (onOpenLegal) {
                onOpenChange(false);
                onOpenLegal();
              }
            }}
          >
            <BookOpen className="h-4 w-4" />
            {t("buttons.legal")}
          </button>
        </div>

        {showChangelog && (
          <div className="w-full rounded-md border border-border bg-surface-sunken p-3 text-left">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                {t("info.changelog_title") || "Release notes"}
              </div>
              <div className="flex items-center gap-1">
                <select
                  className="input h-9 w-auto min-w-[80px] text-xs disabled:opacity-50"
                  style={{
                    width: selectedTag
                      ? `${Math.max(80, (selectedTag.length + (selectedRelease?.prerelease ? 6 : 0)) * 6.5 + 24)}px`
                      : "auto",
                  }}
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  disabled={!releases || releases.length === 0}
                >
                  {(releases ?? []).map((r) => (
                    <option key={r.tag_name} value={r.tag_name}>
                      {r.tag_name}
                      {r.prerelease ? " (pre)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-ghost px-1.5 text-[11px]"
                  onClick={() => void loadReleases()}
                  disabled={loadingReleases}
                  title={t("buttons.refresh") || "Refresh"}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      loadingReleases ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {loadingReleases && !releases && (
              <div className="flex items-center gap-2 py-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("labels.loading") || "Loading…"}
              </div>
            )}
            {changelogError && (
              <div className="py-2 text-xs text-danger">
                {t("messages.changelog_error", { error: changelogError }) ||
                  `Failed to load changelog: ${changelogError}`}
              </div>
            )}
            {!loadingReleases &&
              !changelogError &&
              releases &&
              releases.length === 0 && (
                <div className="py-2 text-xs text-muted">
                  {t("messages.no_releases") || "No releases published yet."}
                </div>
              )}
            {selectedRelease && (
              <div className="max-h-72 overflow-auto pr-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {selectedRelease.name || selectedRelease.tag_name}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] text-muted hover:text-primary"
                    onClick={() => openLink(selectedRelease.html_url)}
                    title={selectedRelease.html_url}
                  >
                    <ExternalLink className="inline h-3 w-3" />{" "}
                    {t("buttons.view_on_github") || "GitHub"}
                  </button>
                </div>
                {selectedRelease.published_at && (
                  <div className="mb-2 text-[10px] uppercase tracking-wide text-subtle">
                    {new Date(
                      selectedRelease.published_at,
                    ).toLocaleDateString()}
                  </div>
                )}
                <Markdown source={selectedRelease.body || ""} />
              </div>
            )}
          </div>
        )}

        {showFaq && (
          <div className="w-full rounded-md border border-border bg-surface-sunken p-3 text-left">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
              {t("info.faq_title") || "Frequently Asked Questions"}
            </div>
            <div className="flex flex-col">
              <FaqItem 
                q={t("faq.download_issues_q") || "Что делать если обои не скачиваются?"} 
                a={t("faq.download_issues_a") || "Попробовать снова, возможно немного подождать.\nМожеть быть такое, что пароли от системных аккаунтов для загрузки устарели, в таком случае можно:\n1) Добавить свой личный аккаунт без Steam Guard с копией Wallpaper Engine (Вкладка аккаунты в настройках) (Но зачем вам это, не понятно)\n2) Купить на различных площадках оффлайн-активации Wallpaper Engine без Steam Guard и добавить по методу выше (Стоят очень дёшего)\n3) Написать Issue в репозиторий на GitHub и я постараюсь оперативно обновить рабочие аккаунты"} 
              />
              <FaqItem 
                q={t("faq.login_issues_q") || "В приложении не загружаются обои или возникает ошибка логина Steam"} 
                a={t("faq.login_issues_a") || "Если вам не нужен 18+ контент, то можете не беспокоиться об этом и просто игнорировать.\n\nВ ином случае, откройте папку с данными (кнопка 'Open Data Folder' в окне About) и удалите папку «EBWebView» (это сбросит кэш встроенного браузера). Перезапустите программу.\n\nЕсли проблема не решилась/не решается долгое время, скорее всего проблемы с системным аккаунтом парсера, попробуйте указать свой собственный аккаунт Steam в настройках парсера (Accounts -> Custom account). Вы можете использовать любой аккаунт (пустышку), главное чтобы в настройках вашего аккаунта не было поставлено ограничений на 18+ контент.\n\nПри необходимости в будущем будет создано больше системных аккаунтов с автоматической выборкой."} 
              />
              <FaqItem 
                q={t("faq.extract_q") || "Почему у некоторых загруженных обоев не работает кнопка 'Extract'?"} 
                a={t("faq.extract_a") || "Не все обои в Workshop являются полноценными проектами (с файлом project.json). Существуют видео-обои (MP4) или веб-обои (HTML). Они уже готовы к использованию, и их не нужно (и технически невозможно) распаковывать как проекты Wallpaper Engine."} 
              />
              <FaqItem 
                q={t("faq.storage_q") || "Где хранятся скачанные обои?"} 
                a={t("faq.storage_a") || "Все скачанные обои сохраняются напрямую в корневую папку Wallpaper Engine в директорию `projects/myprojects`. Они сразу же становятся доступны в официальном приложении без дополнительных действий с вашей стороны."} 
              />
              <FaqItem 
                q={t("faq.visibility_q") || "Обои скачиваются, но в оригинальном приложении их не видно"} 
                a={t("faq.visibility_a") || "Убедитесь, что в настройках (System & Integration) вы указали правильный путь до папки Wallpaper Engine. Путь должен указывать на корневую папку, где лежат исполняемые файлы (wallpaper32.exe / wallpaper64.exe)."} 
              />
            </div>
          </div>
        )}

        <div className="w-full pt-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-subtle">
            {t("info.tools_section_title")}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            {TOOLS.map((tool) => (
              <button
                key={tool.label}
                type="button"
                className="inline-flex items-center gap-1 text-muted hover:text-primary"
                onClick={() => openLink(tool.url)}
                title={tool.license ? `License: ${tool.license}` : undefined}
              >
                {tool.label}
                {tool.license && (
                  <span className="text-[10px] text-subtle">
                    ({tool.license})
                  </span>
                )}
                <ExternalLink className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
