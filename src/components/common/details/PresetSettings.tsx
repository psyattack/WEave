import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { tryInvoke } from "@/lib/tauri";
import { InstalledWallpaper } from "@/types/workshop";
import { Settings2, RotateCcw, Save, Check } from "lucide-react";
import { Tooltip } from "@/components/common/Tooltip";
import { Switch } from "@/components/common/Switch";
import { useTranslation } from "@/i18n/hooks";

interface PresetSettingsProps {
  item: InstalledWallpaper;
  open: boolean;
}

const DEFAULT_STATIC_PROPERTIES: Record<string, any> = {
  rate: { type: "slider", textKey: "rate", defaultText: "Playback Rate", min: 1, max: 144, default: 60 },
  volume: { type: "slider", textKey: "volume", defaultText: "Volume", min: 0, max: 100, default: 50 },
  audioprocessing: { type: "bool", textKey: "audio_processing", defaultText: "Audio Processing", default: true },
  alignment: { type: "combo", textKey: "alignment", defaultText: "Alignment", default: 0, options: ["Center", "Left", "Right", "Top", "Bottom", "Free"] },
  alignmentfliph: { type: "bool", textKey: "flip_horizontal", defaultText: "Flip Horizontal", default: false },
  alignmentposition: { type: "slider", textKey: "alignment_position", defaultText: "Alignment Position", min: 0, max: 100, default: 50 },
  alignmentx: { type: "slider", textKey: "alignment_x", defaultText: "X Offset", min: 0, max: 100, default: 50 },
  alignmenty: { type: "slider", textKey: "alignment_y", defaultText: "Y Offset", min: 0, max: 100, default: 50 },
  alignmentz: { type: "slider", textKey: "alignment_z", defaultText: "Zoom", min: 0, max: 200, default: 100 },
  schemecolor: { type: "color", textKey: "scheme_color", defaultText: "Scheme Color", default: "1 1 1" },
  wec_e: { type: "bool", textKey: "enable_colors", defaultText: "Enable Color Settings", default: true },
  wec_brs: { type: "slider", textKey: "brightness", defaultText: "Brightness", min: 0, max: 100, default: 50, condition: "wec_e" },
  wec_con: { type: "slider", textKey: "contrast", defaultText: "Contrast", min: 0, max: 100, default: 50, condition: "wec_e" },
  wec_sa: { type: "slider", textKey: "saturation", defaultText: "Saturation", min: 0, max: 100, default: 50, condition: "wec_e" },
  wec_hue: { type: "slider", textKey: "hue", defaultText: "Hue Shift", min: 0, max: 100, default: 50, condition: "wec_e" },
  wcc_v: { type: "combo", textKey: "filter", defaultText: "Filter", default: "", 
    options: ["None", "K23", "Adventure", "Coloration", "Simple Film", "Blue Navy", "80s Action", "Desert", "Desperado", "Dusk", "Honey", "Sandy Sky", "Slate", "Western", "Setting Sun", "Tower", "Amber", "Aliens", "Daisy", "Emerald", "Back Sea", "Beach", "Studio", "Wasteland", "Gameboy"],
    optionValues: ["", "k23_b", "lutx32_adventure", "lutx32_coloration", "simple_film", "lutx32_bluenavy", "80s_post-apocalyptic_action", "desert_4", "desperado", "lutx32_dusk", "lutx32_honeyb", "lutx32_sandyskyd", "lutx32_slate", "lutx32_westernf", "setting_sun", "tower", "lutx32_amber", "aliens_2", "lutx32_daisy",  "lutx32_emeraldd", "lutx32_ferne", "lutx32_backsea", "lutx32_beach",  "lutx32_studio", "sharp_wasteland", "gamebob_2"]
  },
  wcc_amt: { type: "slider", textKey: "filter_amount", defaultText: "Filter Amount", min: 0, max: 100, default: 100, condition: "wcc_v" },
};

function parseColor(val: string): string {
  try {
    const parts = val.split(" ").map(parseFloat);
    if (parts.length >= 3) {
      const r = Math.round(parts[0] * 255);
      const g = Math.round(parts[1] * 255);
      const b = Math.round(parts[2] * 255);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
  } catch {
    // Ignore error
  }
  return "#ffffff";
}

function stringifyColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return `${r.toFixed(5)} ${g.toFixed(5)} ${b.toFixed(5)}`;
}

export default function PresetSettings({ item, open }: PresetSettingsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const projectData: any = await tryInvoke("we_get_project_json", { projectJsonPath: item.project_json_path });
      const props = projectData?.general?.properties || {};
      
      setProperties(props);
      
      const initialValues: Record<string, any> = {};
      for (const [k, v] of Object.entries(props)) {
        const p = v as any;
        initialValues[k] = p.value;
      }
      for (const [k, v] of Object.entries(DEFAULT_STATIC_PROPERTIES)) {
        initialValues[k] = props[k]?.value ?? v.default;
      }
      setCurrentValues(initialValues);
      return initialValues;
    } catch (e) {
      console.error("Failed to load preset settings:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [item.project_json_path]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadSettings();
    }
    return () => { mounted = false; };
  }, [loadSettings]);

  const handleChange = useCallback((key: string, value: any) => {
    setCurrentValues(prev => ({ ...prev, [key]: value }));
    
    // Apply live
    tryInvoke("we_apply_properties", {
      pubfileid: item.pubfileid,
      properties: { [key]: value },
    }).catch(console.error);

  }, [item.pubfileid]);

  const renderProperty = (key: string, propData: any) => {
    const value = currentValues[key];
    const type = propData.type || "bool";
    const text = propData.textKey ? (t(`preset_settings.${propData.textKey}` as any) || propData.defaultText) : (propData.text || key);

    // Check condition
    if (propData.condition) {
      const condKey = propData.condition.split(".")[0];
      const condVal = currentValues[condKey];
      if (condVal === false || condVal === 0 || condVal === "") {
        return null;
      }
    }

    if (type === "bool") {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <span className="text-sm text-white/80">{text}</span>
          <Switch 
            checked={!!value} 
            onCheckedChange={(v) => handleChange(key, v)} 
          />
        </div>
      );
    }

    if (type === "slider") {
      const min = propData.min ?? 0;
      const max = propData.max ?? 100;
      return (
        <div key={key} className="flex flex-col gap-2 py-2">
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{text}</span>
            <span className="text-white/50">{typeof value === "number" ? value.toFixed(propData.precision || 0) : value}</span>
          </div>
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={propData.step || 1} 
            value={value ?? min} 
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-primary"
          />
        </div>
      );
    }

    if (type === "color") {
      const hex = typeof value === "string" ? parseColor(value) : "#ffffff";
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <span className="text-sm text-white/80">{text}</span>
          <div className="flex items-center gap-2">
            <input 
              type="color" 
              value={hex}
              onChange={(e) => handleChange(key, stringifyColor(e.target.value))}
              className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </div>
        </div>
      );
    }

    if (type === "combo") {
      const options = propData.options || [];
      const optionValues = propData.optionValues;
      return (
        <div key={key} className="flex flex-col gap-1.5 py-2">
          <span className="text-sm text-white/80">{text}</span>
          <select 
            value={value ?? (optionValues ? optionValues[0] : 0)}
            onChange={(e) => {
              const val = e.target.value;
              if (optionValues) {
                handleChange(key, val);
              } else {
                handleChange(key, parseInt(val, 10));
              }
            }}
            className="w-full cursor-pointer appearance-none rounded-md border border-white/5 bg-black/40 px-3 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-black/60 focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {options.map((opt: string, i: number) => {
              const optVal = optionValues ? optionValues[i] : i;
              const optKey = opt.toLowerCase().replace(/\s+/g, '_');
              const translatedOpt = t(`preset_settings.options.${optKey}` as any) || opt;
              return <option key={i} value={optVal} className="bg-background">{translatedOpt}</option>;
            })}
          </select>
        </div>
      );
    }

    return null;
  };

  const customProps = Object.entries(properties)
    .filter(([k]) => !DEFAULT_STATIC_PROPERTIES[k])
    .sort((a, b) => (a[1].order ?? 999) - (b[1].order ?? 999));

  return (
    <AnimatePresence>
      {open && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute top-0 right-full z-0 flex h-full w-80 flex-col border-l border-white/10 bg-background/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
        >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2 font-medium text-white">
            <Settings2 className="size-5 text-primary" />
            {t("labels.preset_settings") || "Preset Settings"}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content={t("tooltips.restore_defaults") || "Restore Defaults"} side="top">
              <button
                onClick={async () => {
                  try {
                    await tryInvoke("we_restore_project_properties", {
                      projectJsonPath: item.project_json_path
                    });
                    const newVals = await loadSettings();
                    if (newVals) {
                      await tryInvoke("we_apply_properties", {
                        pubfileid: item.pubfileid,
                        properties: newVals
                      });
                    }
                  } catch (e) {
                    console.error("Restore failed:", e);
                  }
                }}
                className="btn-icon text-muted-foreground transition-colors hover:bg-red-500/20 hover:text-red-400"
              >
                <RotateCcw className="size-4" />
              </button>
            </Tooltip>
            <Tooltip content={t("tooltips.fixate_changes") || "Fixate Changes"} side="top">
              <button
                onClick={async () => {
                  if (saveStatus === "saving") return;
                  setSaveStatus("saving");
                  try {
                    await tryInvoke("we_save_project_properties", {
                      projectJsonPath: item.project_json_path,
                      properties: currentValues
                    });
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                  } catch (e) {
                    console.error(e);
                    setSaveStatus("idle");
                  }
                }}
                disabled={saveStatus === "saving"}
                className={`btn-icon transition-colors ${
                  saveStatus === "saved" 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-primary/20 text-primary hover:bg-primary/30"
                }`}
              >
                {saveStatus === "saved" ? <Check className="size-4" /> : <Save className="size-4" />}
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {customProps.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">
                    {t("labels.project_properties") || "Project Properties"}
                  </h3>
                  <div className="flex flex-col gap-1">
                    {customProps.map(([k, v]) => renderProperty(k, v))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wider text-primary uppercase">
                  {t("labels.global_settings") || "Global Settings"}
                </h3>
                <div className="flex flex-col gap-1">
                  {Object.entries(DEFAULT_STATIC_PROPERTIES).map(([k, v]) => renderProperty(k, v))}
                </div>
              </div>
            </div>
          )}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
