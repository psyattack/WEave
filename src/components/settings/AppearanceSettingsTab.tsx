
import { useTranslation } from "@/i18n/hooks";
import Select from "@/components/common/Select";
import { persistTheme } from "@/hooks/useTheme";
import { inTauri, invoke } from "@/lib/tauri";
import { ThemeCode, useAppStore } from "@/stores/app";
import { Row, Section, THEMES, ACCENTS } from "./SettingsDialogShared";

export default function AppearanceSettingsTab() {
  const { t } = useTranslation();
  const state = useAppStore();

  return (
    <div className="space-y-4 p-4">
      <Section title={t("settings.appearance") || "Appearance"} defaultOpen>
        <Row
          label={t("settings.theme") || "Theme"}
          description={
            t("settings.theme_hint") || "Color theme for the application"
          }
        >
          <Select
            value={state.theme}
            options={THEMES}
            onValueChange={(v) => {
              state.setTheme(v as ThemeCode);
              void persistTheme(v as ThemeCode);
            }}
          />
        </Row>
        <Row
          label={t("settings.accent_color") || "Accent color"}
          description={
            t("settings.accent_hint") ||
            "Highlight color used throughout the interface"
          }
        >
          <AccentPicker />
        </Row>
      </Section>
    </div>
  );
}

function AccentPicker() {
  const state = useAppStore();

  return (
    <div className="flex flex-wrap gap-2.5">
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
  );
}
