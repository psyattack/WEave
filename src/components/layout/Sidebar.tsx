import { motion } from "framer-motion";
import { useTranslation } from "@/i18n/hooks";
import type { TranslationKey } from "@/i18n/types";

import {
  AlertCircle,
  CheckCircle2,
  FolderHeart,
  Globe,
  Layers,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useAppStore } from "@/stores/app";
import {
  useSteamSessionStore,
  SteamSessionPhase,
} from "@/stores/steam-session";
import AppIcon from "@/components/common/AppIcon";

export type NavKey = "workshop" | "collections" | "installed";

interface SidebarProps {
  current: NavKey;
  onChange: (key: NavKey) => void;
}

const NAV: { key: NavKey; icon: typeof Globe; labelKey: string }[] = [
  { key: "workshop", icon: Globe, labelKey: "tabs.workshop" },
  { key: "collections", icon: Layers, labelKey: "tabs.collections" },
  { key: "installed", icon: FolderHeart, labelKey: "tabs.wallpapers" },
];

export default function Sidebar({ current, onChange }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-2 border-r border-white/5 bg-surface-sunken/70 py-4 backdrop-blur-md transition-[width] duration-200 ease-out",
        collapsed
          ? "w-16 items-center px-1"
          : "w-41.25 items-stretch px-3",
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-center gap-2",
          collapsed ? "justify-center px-0" : "px-1",
        )}
      >
        <div className="flex size-9 items-center justify-center">
          <AppIcon className="size-9" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">WEave</span>
            <span className="text-[11px] text-subtle">Wallpaper Engine</span>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.key === current;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "nav-item relative",
                collapsed ? "justify-center" : "justify-start",
                active && "nav-item-active",
              )}
              aria-current={active ? "page" : undefined}
              aria-label={i18n.t(item.labelKey as any)}
            >
              {active && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute inset-0 -z-10 rounded-md bg-primary/10"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                />
              )}
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{i18n.t(item.labelKey as any)}</span>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <SteamSessionStatus collapsed={collapsed} />

        <button
          type="button"
          onClick={toggle}
          className={cn(
            "nav-item text-subtle hover:text-foreground",
            collapsed ? "justify-center" : "justify-start",
          )}
          aria-label={
            collapsed
              ? t("tooltips.expand_sidebar")
              : t("tooltips.collapse_sidebar")
          }
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5 shrink-0" />
          ) : (
            <PanelLeftClose className="size-5 shrink-0" />
          )}
          {!collapsed && <span>{t("tooltips.collapse_sidebar")}</span>}
        </button>
      </div>
    </aside>
  );
}

interface StatusVisuals {
  Icon: typeof Globe;
  spin: boolean;
  /** Tailwind text-color class for the icon. */
  tone: string;
  /** Tailwind background/border accent for the dot in collapsed mode. */
  dotTone: string;
  labelKey: TranslationKey;
}

function visualsFor(phase: SteamSessionPhase): StatusVisuals | null {
  switch (phase) {
    case "logging-in":
      return {
        Icon: Loader2,
        spin: true,
        tone: "text-primary",
        dotTone: "bg-primary",
        labelKey: "steam_status.logging_in",
      };
    case "logged-in":
      return {
        Icon: CheckCircle2,
        spin: false,
        tone: "text-success",
        dotTone: "bg-success",
        labelKey: "steam_status.signed_in",
      };
    case "error":
      return {
        Icon: AlertCircle,
        spin: false,
        tone: "text-danger",
        dotTone: "bg-danger",
        labelKey: "steam_status.error",
      };
    // `idle` (nothing happened yet / non-Tauri) renders nothing.
    default:
      return null;
  }
}

/**
 * Compact Steam parser login status shown just above the Collapse button.
 * When the sidebar is collapsed it shrinks to an icon-only badge (matching
 * every other left-menu item), exposing the textual status through `title`.
 */
function SteamSessionStatus({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const phase = useSteamSessionStore((s) => s.phase);

  const visuals = visualsFor(phase);
  if (!visuals) return null;

  const { Icon, spin, tone, dotTone, labelKey } = visuals;
  const label = t(labelKey);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-2 py-1.5 text-[11px]",
        collapsed ? "relative justify-center" : "justify-start",
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone, spin && "animate-spin")} />
      {collapsed ? (
        // Tiny state dot in the corner reinforces the phase when only the
        // icon is visible (and keeps error/unknown legible at a glance).
        <span
          className={cn(
            "absolute top-1 right-1 size-1.5 rounded-full",
            dotTone,
            spin && "animate-pulse",
          )}
        />
      ) : (
        <span className={cn("truncate", tone)}>{label}</span>
      )}
    </div>
  );
}
