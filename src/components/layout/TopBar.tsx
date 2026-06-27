import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import { tryInvoke } from "@/lib/tauri";
import {
  Droplet,
  Info,
  Layers,
  Leaf,
  ListTodo,
  Moon,
  MoonStar,
  RefreshCw,
  Settings,
  Sun,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  SlidersHorizontal,
  ListVideo,
  MonitorCog,
  MonitorPlay,
  X
} from "lucide-react";

import { useAppStore, ThemeCode } from "@/stores/app";
import { useTasksStore } from "@/stores/tasks";
import { triggerGlobalRefresh } from "@/stores/refresh";
import { persistTheme, THEME_CODES } from "@/hooks/useTheme";
import { maybeMinimize } from "@/lib/window";
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

  const [isMuted, setIsMuted] = useState(false);
  const [iconsHidden, setIconsHidden] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  
  const [showPlaylistInput, setShowPlaylistInput] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [showProfileInput, setShowProfileInput] = useState(false);
  const [profileName, setProfileName] = useState("");

  const loadPlaylist = () => {
    if (playlistName.trim()) {
      tryInvoke("we_open_playlist", { playlist: playlistName.trim() }).catch(console.error);
      setPlaylistName("");
      setShowPlaylistInput(false);
    }
  };

  const loadProfile = () => {
    if (profileName.trim()) {
      tryInvoke("we_open_profile", { profile: profileName.trim() }).catch(console.error);
      setProfileName("");
      setShowProfileInput(false);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      tryInvoke("we_unmute").catch(console.error);
    } else {
      tryInvoke("we_mute").catch(console.error);
    }
    setIsMuted(!isMuted);
  };

  const handleIconsToggle = () => {
    if (iconsHidden) {
      tryInvoke("we_show_icons").catch(console.error);
    } else {
      tryInvoke("we_hide_icons").catch(console.error);
    }
    setIconsHidden(!iconsHidden);
  };

  return (
    <div className="relative z-50 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur-md">
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
        {/* Media Controls Action Button */}
        <div className="flex items-center">
          <AnimatePresence>
            {controlsOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="mr-2 flex items-center overflow-hidden rounded-full border border-white/10 bg-black/50 shadow-lg backdrop-blur-xl"
              >
                <div className="flex w-max items-center gap-1 p-1.5 whitespace-nowrap">
                  <Tooltip content={t("tooltips.previous_wallpaper") || "Previous"} side="bottom">
                    <button className="btn-icon rounded-full hover:bg-white/10" onClick={() => tryInvoke("we_previous_wallpaper").catch(console.error)}>
                      <SkipBack className="size-4" />
                    </button>
                  </Tooltip>
                  
                  <Tooltip content={t("tooltips.stop") || "Stop"} side="bottom">
                    <button className="btn-icon rounded-full hover:bg-white/10" onClick={() => tryInvoke("we_stop").catch(console.error)}>
                      <Square className="size-4" />
                    </button>
                  </Tooltip>

                  <Tooltip content={t("tooltips.play") || "Play"} side="bottom">
                    <button className="btn-icon rounded-full hover:bg-white/10" onClick={() => tryInvoke("we_play").catch(console.error)}>
                      <Play className="size-4" />
                    </button>
                  </Tooltip>
                  
                  <Tooltip content={t("tooltips.pause") || "Pause"} side="bottom">
                    <button className="btn-icon rounded-full hover:bg-white/10" onClick={() => tryInvoke("we_pause").catch(console.error)}>
                      <Pause className="size-4" />
                    </button>
                  </Tooltip>

                  <Tooltip content={t("tooltips.next_wallpaper") || "Next"} side="bottom">
                    <button className="btn-icon rounded-full hover:bg-white/10" onClick={() => tryInvoke("we_next_wallpaper").catch(console.error)}>
                      <SkipForward className="size-4" />
                    </button>
                  </Tooltip>

                  <div className="mx-1 h-4 w-px bg-white/20" />

                  <Tooltip content={isMuted ? (t("tooltips.unmute") || "Unmute") : (t("tooltips.mute") || "Mute")} side="bottom">
                    <button className={`btn-icon rounded-full hover:bg-white/10 ${isMuted ? "text-red-400" : ""}`} onClick={handleMuteToggle}>
                      {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    </button>
                  </Tooltip>

                  <Tooltip content={iconsHidden ? (t("tooltips.show_icons") || "Show Desktop Icons") : (t("tooltips.hide_icons") || "Hide Desktop Icons")} side="bottom">
                    <button className={`btn-icon rounded-full hover:bg-white/10 ${iconsHidden ? "text-primary" : ""}`} onClick={handleIconsToggle}>
                      {iconsHidden ? <MonitorOff className="size-4" /> : <Monitor className="size-4" />}
                    </button>
                  </Tooltip>

                  <div className="mx-1 h-4 w-px bg-white/20" />

                  {/* Playlist Control */}
                  {showPlaylistInput ? (
                    <div className="flex h-8 items-center gap-1 rounded-full bg-black/50 px-2 py-1">
                      <ListVideo className="text-muted-foreground mr-1 size-3" />
                      <input
                        type="text"
                        value={playlistName}
                        onChange={(e) => setPlaylistName(e.target.value)}
                        placeholder={t("labels.playlist_name") || "Playlist Name"}
                        className="h-full w-24 border-none bg-transparent p-0 text-xs text-white outline-none placeholder:text-white/50 focus:ring-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadPlaylist();
                          if (e.key === "Escape") setShowPlaylistInput(false);
                        }}
                        autoFocus
                      />
                      <button onClick={loadPlaylist} className="btn-icon ml-1 size-5 rounded-full bg-primary/20 text-primary hover:bg-primary/30">
                        <Play className="size-3" />
                      </button>
                      <button onClick={() => setShowPlaylistInput(false)} className="btn-icon text-muted-foreground ml-1 size-5 rounded-full hover:bg-white/10">
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                      onClick={() => setShowPlaylistInput(true)}
                    >
                      <ListVideo className="size-4" />
                      <span>{t("tooltips.load_playlist") || "Load Playlist"}</span>
                    </button>
                  )}

                  <div className="mx-1 h-4 w-px bg-white/20" />

                  {/* Profile Control */}
                  {showProfileInput ? (
                    <div className="flex h-8 items-center gap-1 rounded-full bg-black/50 px-2 py-1">
                      <MonitorCog className="text-muted-foreground mr-1 size-3" />
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder={t("labels.profile_name") || "Profile Name"}
                        className="h-full w-24 border-none bg-transparent p-0 text-xs text-white outline-none placeholder:text-white/50 focus:ring-0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadProfile();
                          if (e.key === "Escape") setShowProfileInput(false);
                        }}
                        autoFocus
                      />
                      <button onClick={loadProfile} className="btn-icon ml-1 size-5 rounded-full bg-primary/20 text-primary hover:bg-primary/30">
                        <Play className="size-3" />
                      </button>
                      <button onClick={() => setShowProfileInput(false)} className="btn-icon text-muted-foreground ml-1 size-5 rounded-full hover:bg-white/10">
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                      onClick={() => setShowProfileInput(true)}
                    >
                      <MonitorCog className="size-4" />
                      <span>{t("tooltips.load_profile") || "Load Profile"}</span>
                    </button>
                  )}

                  <div className="mx-1 h-4 w-px bg-white/20" />

                  {/* Open WE Control */}
                  <button
                    className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                    onClick={async () => {
                      await tryInvoke("we_open", { show_window: true }).catch(console.error);
                      void maybeMinimize();
                    }}
                  >
                    <MonitorPlay className="size-4" />
                    <span>{t("tooltips.open_we") || "Open WE"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Tooltip content={t("tooltips.media_controls") || "Media Controls"} side="bottom">
            <button
              className={`btn-icon transition-colors ${controlsOpen ? "bg-primary/20 text-primary" : ""}`}
              onClick={() => setControlsOpen(!controlsOpen)}
            >
              <SlidersHorizontal className="size-5" />
            </button>
          </Tooltip>
        </div>
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
