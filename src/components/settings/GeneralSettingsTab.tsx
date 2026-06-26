import React, { useState } from "react";
import { open as openPath } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "@/i18n/hooks";
import Select from "@/components/common/Select";
import { Switch } from "@/components/common/Switch";
import { changeLanguageTo } from "@/hooks/useBootstrap";
import { persistTheme } from "@/hooks/useTheme";
import { inTauri, invoke, tryInvokeOk } from "@/lib/tauri";
import { pushToast } from "@/stores/toasts";
import { ThemeCode, useAppStore } from "@/stores/app";
import { Row, Section, SettingSwitch } from "./SettingsDialogShared";
import { Search } from "lucide-react";

const THEMES: { value: ThemeCode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "nord", label: "Nord" },
  { value: "solarized", label: "Solarized" },
  { value: "black", label: "Black" },
];

const ACCENTS: { value: string; label: string; color: string }[] = [
  { value: "indigo", label: "Indigo", color: "#6366f1" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "purple", label: "Purple", color: "#a855f7" },
  { value: "pink", label: "Pink", color: "#ec4899" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
  { value: "orange", label: "Orange", color: "#f97316" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "teal", label: "Teal", color: "#14b8a6" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
];

function SectionWrap({ title, children }: { title: string; children: React.ReactNode }) {
  const visibleChildren = React.Children.toArray(children);
  if (visibleChildren.length === 0) return null;
  return <Section title={title}>{visibleChildren}</Section>;
}

export default function GeneralSettingsTab() {
  const { t } = useTranslation();
  const state = useAppStore();
  const [q, setQ] = useState("");
  const query = q.toLowerCase();

  const match = (text: string) => text.toLowerCase().includes(query);

  const renderRow = (
    label: string,
    desc: string,
    node: React.ReactNode,
    badge?: string,
    warningBadge?: { text: string; tooltip: string }
  ) => {
    if (query && !match(label) && !match(desc)) return null;
    const path = (node as any)?.props?.path;
    const id = path ? path.replace(/\./g, "-") : (node as any)?.props?.id;
    const clonedNode = id ? React.cloneElement(node as React.ReactElement<any>, { id }) : node;
    return (
      <Row label={label} description={desc} badge={badge} warningBadge={warningBadge} key={label} id={id}>
        {clonedNode}
      </Row>
    );
  };



  return (
    <div className="space-y-6 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder={t("labels.search_placeholder") || "Search settings..."}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-surface-sunken/40 border border-white/10 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder-white/30"
        />
      </div>

      <SectionWrap title={t("settings.interface_personalization") || "Interface & Personalization"}>
        {renderRow(
          t("settings.language") || "Language",
          t("settings.language_hint") || "Interface language",
          <Select
            id="settings-language"
            value={state.language}
            options={state.availableLanguages.map((l) => ({
              value: l.code,
              label: l.label,
            }))}
            onValueChange={(v) => {
              void changeLanguageTo(v);
            }}
          />
        )}
        {renderRow(
          t("settings.theme") || "Theme",
          t("settings.theme_hint") || "Color theme for the application",
          <Select
            id="settings-theme"
            value={state.theme}
            options={THEMES}
            onValueChange={(v) => {
              state.setTheme(v as ThemeCode);
              void persistTheme(v as ThemeCode);
            }}
          />
        )}
        {renderRow(
          t("settings.accent_color") || "Accent color",
          t("settings.accent_hint") || "Highlight color used throughout the interface",
          <div className="flex flex-wrap gap-2.5 justify-end">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                aria-label={a.label}
                title={a.label}
                onClick={() => {
                  state.setAccent(a.value);
                  if (inTauri) {
                    void invoke("config_set", {
                      path: "settings.general.appearance.accent",
                      value: a.value,
                    }).catch(() => undefined);
                  }
                }}
                className={
                  state.accent === a.value
                    ? "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface-sunken ring-foreground transition-all"
                    : "h-7 w-7 rounded-full ring-1 ring-border hover:ring-foreground hover:scale-110 transition-all"
                }
                style={{ backgroundColor: a.color }}
              />
            ))}
          </div>
        )}
        {renderRow(
          t("settings.enable_3d_cards") || "3D Card effect",
          t("settings.enable_3d_cards_hint") || "Tilt cards on hover",
          <Switch
            checked={state.enable3dCards}
            onCheckedChange={(v) => state.setEnable3dCards(v)}
          />
        )}
        {renderRow(
          t("settings.layout_animations") || "Smooth Grid Animations",
          t("settings.layout_animations_hint") || "Enable beautiful layout animations when resizing or sorting grids",
          <Switch
            checked={state.enableLayoutAnimations}
            onCheckedChange={(v) => state.setEnableLayoutAnimations(v)}
          />,
          "BETA",
          {
            text: "HIGH LOAD",
            tooltip: t("settings.layout_animations_warning") || "This setting strongly affects performance and is not recommended on weak systems."
          }
        )}
      </SectionWrap>

      <SectionWrap title={t("settings.behavior_workflow") || "Behavior & Workflow"}>
        {renderRow(
          t("settings.save_window_state") || "Save window state",
          t("settings.save_window_state_hint") || "Remember window size and position between sessions",
          <SettingSwitch path="settings.general.behavior.save_window_state" fallback={true} />
        )}
        {renderRow(
          t("settings.auto_check_updates") || "Auto check updates",
          t("settings.auto_check_updates_hint") || "Automatically check for application updates on startup",
          <SettingSwitch path="settings.general.behavior.auto_check_updates" fallback={true} />
        )}
        {renderRow(
          t("settings.minimize_on_apply") || "Minimize on apply",
          t("settings.minimize_on_apply_hint") || "Minimize window when applying a wallpaper",
          <SettingSwitch path="settings.general.behavior.minimize_on_apply" fallback={false} />
        )}
        {renderRow(
          t("settings.preload_next_page") || "Preload next page",
          t("settings.preload_next_page_hint") || "Load the next page in the background for faster navigation",
          <SettingSwitch path="settings.general.behavior.preload_next_page" fallback={true} />,
          "BETA"
        )}
        {renderRow(
          t("settings.auto_apply_last_downloaded") || "Auto apply last downloaded",
          t("settings.auto_apply_hint") || "Automatically apply wallpaper after download completes",
          <SettingSwitch path="settings.general.behavior.auto_apply_last_downloaded" fallback={false} />
        )}
        {renderRow(
          t("settings.auto_open_login") || "Automatically open login form on failure",
          t("settings.auto_open_login_hint") || "Show the login form if Steam session requires authentication on startup",
          <Switch
            checked={state.showLoginPromptOnFail}
            onCheckedChange={(v) => state.setShowLoginPromptOnFail(v)}
          />
        )}
      </SectionWrap>

      <SectionWrap title={t("settings.system_integration") || "System & Integration"}>
        {renderRow(
          t("settings.we_directory") || "WE Directory",
          t("settings.we_directory_hint") || "Path to your Wallpaper Engine install folder. Required for Apply / Extract.",
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-[220px] bg-white/5 border-white/10"
              readOnly
              value={state.weDirectory}
            />
            <button
              className="hover-shimmer px-4 py-2 bg-white/10 hover:bg-white/20 transition-all rounded-md text-sm font-medium border border-white/10"
              onClick={async () => {
                const folder = await openPath({ directory: true });
                if (!folder || Array.isArray(folder)) return;
                if (!inTauri) return;
                const ok = await tryInvokeOk("we_set_directory", { path: folder });
                if (ok) state.setWeDirectory(folder);
                else pushToast(t("messages.invalid_we_directory"), "error");
              }}
            >
              {t("buttons.browse") || "Browse"}
            </button>
          </div>
        )}
      </SectionWrap>

      {query && (
        <div className="text-center text-muted text-sm py-8 opacity-50">
          {t("labels.end_of_search") || "End of search results."}
        </div>
      )}
    </div>
  );
}
