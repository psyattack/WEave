import { motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import {
  Droplet,
  Info,
  Layers,
  Leaf,
  ListTodo,
  Moon,
  MoonStar,
//   Palette,
  RefreshCw,
  Settings,
  Sun,
} from "lucide-react";

import { useAppStore, ThemeCode } from "@/stores/app";
import { useTasksStore } from "@/stores/tasks";
import { triggerGlobalRefresh } from "@/stores/refresh";
import { persistTheme, THEME_CODES } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/common/Tooltip";

function ThemeIcon({ theme }: { theme: ThemeCode }) {
  if (theme === "light") return <Sun className="size-5" />;
  if (theme === "nord") return <Droplet className="size-5" />;
  if (theme === "solarized") return <Leaf className="size-5" />;
  if (theme === "black") return <MoonStar className="size-5" />;
  return <Moon className="size-5" />;
}

interface Props {
  onOpenSettings: () => void;
  onOpenMulti: () => void;
  onOpenInfo: () => void;
  onOpenTasks: () => void;
}

export default function TopBar({
  onOpenSettings,
  onOpenMulti,
  onOpenInfo,
  onOpenTasks,
}: Props) {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const tasks = useTasksStore((s) => s.tasks);
  const activeCount = Object.values(tasks).length;

  const cycleTheme = () => {
    const i = THEME_CODES.indexOf(theme);
    const next = THEME_CODES[(i + 1) % THEME_CODES.length];
    setTheme(next);
    void persistTheme(next);
  };

  return (
    <div className="flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur-md">
      <div className="flex items-center gap-1">
        <Tooltip content={t("tooltips.theme")} side="bottom">
          <motion.button
            whileTap={{ scale: 0.92, rotate: -20 }}
            className="btn-icon"
            onClick={cycleTheme}
          >
            <ThemeIcon theme={theme} />
          </motion.button>
        </Tooltip>
        <Tooltip content={t("tooltips.refresh") || "Refresh"} side="bottom">
          <button
            className="btn-icon"
            onClick={() => triggerGlobalRefresh()}
            aria-label={t("tooltips.refresh") || "Refresh"}
          >
            <RefreshCw className="size-5" />
          </button>
        </Tooltip>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <Tooltip content={t("tooltips.tasks")} side="bottom">
          <button
            className="btn-icon relative"
            onClick={onOpenTasks}
            aria-label={t("dialog.tasks")}
          >
            <ListTodo className="size-5" />
            {activeCount > 0 && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground",
                )}
              >
                {activeCount}
              </span>
            )}
          </button>
        </Tooltip>
        <Tooltip content={t("tooltips.multi_download")} side="bottom">
          <button
            className="btn-icon"
            onClick={onOpenMulti}
            aria-label={t("tooltips.multi_download") || "Multi-Download"}
          >
            <Layers className="size-5" />
          </button>
        </Tooltip>
        <Tooltip content={t("tooltips.info")} side="bottom">
          <button
            className="btn-icon"
            onClick={onOpenInfo}
            aria-label={t("tooltips.info") || "Information"}
          >
            <Info className="size-5" />
          </button>
        </Tooltip>
        <Tooltip content={t("tooltips.settings")} side="bottom">
          <button
            className="btn-icon"
            onClick={onOpenSettings}
            aria-label={t("tooltips.settings") || "Settings"}
          >
            <Settings className="size-5" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
