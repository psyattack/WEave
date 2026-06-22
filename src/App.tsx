import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

import Sidebar, { NavKey } from "@/components/layout/Sidebar";
import TitleBar from "@/components/layout/TitleBar";
import TopBar from "@/components/layout/TopBar";
import WorkshopView from "@/components/views/WorkshopView";
import CollectionsView from "@/components/views/CollectionsView";
import InstalledView from "@/components/views/InstalledView";
import AuthorView from "@/components/views/AuthorView";
import SettingsDialog from "@/components/settings/SettingsDialog";
import MultiDownloadDialog from "@/components/dialogs/MultiDownloadDialog";
import InfoDialog from "@/components/dialogs/InfoDialog";
import UpdateDialog from "@/components/dialogs/UpdateDialog";
import LegalDialog from "@/components/dialogs/LegalDialog";
import TasksDrawer from "@/components/tasks/TasksDrawer";
import ToastStack from "@/components/common/ToastStack";
import SetupOverlay from "@/components/common/SetupOverlay";
import MetadataInitDialog from "@/components/common/MetadataInitDialog";
import { useBootstrap } from "@/hooks/useBootstrap";
import { useApplyTheme, persistTheme, THEME_CODES } from "@/hooks/useTheme";
import { useProductionProtection } from "@/hooks/useProductionProtection";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useAppStore } from "@/stores/app";
import { useNavStore } from "@/stores/nav";
import { useFiltersStore } from "@/stores/filters";
import { triggerGlobalRefresh } from "@/stores/refresh";
import {
  pagePrev,
  pageNext,
  pageFirst,
  pageLast,
} from "@/stores/hotkeys/pagination";

export default function App() {
  useBootstrap();
  useApplyTheme();
  useProductionProtection();
  const ready = useAppStore((s) => s.ready);
  const sub = useNavStore((s) => s.sub);
  const resetNav = useNavStore((s) => s.reset);

  const [view, setView] = useState<NavKey>("workshop");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  const legalAccepted = useAppStore((s) => s.legalAccepted);
  const setLegalAccepted = useAppStore((s) => s.setLegalAccepted);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.classList.add("prefers-reduced-motion");
    } else {
      document.documentElement.classList.remove("prefers-reduced-motion");
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (ready && !legalAccepted) setLegalOpen(true);
  }, [ready, legalAccepted]);



  const setPage = useFiltersStore((s) => s.setPage);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const changeView = (key: NavKey) => {
    resetNav();
    setPage(1);
    setView(key);
  };

  useEffect(() => {
    if (sub.kind === "none") setPage(1);
  }, [sub.kind, setPage]);

  // ─── Global hotkeys ──────────────────────────────────────────────────────
  useHotkeys({
    "page.prev": pagePrev,
    "page.next": pageNext,
    "page.first": pageFirst,
    "page.last": pageLast,

    "nav.workshop": () => changeView("workshop"),
    "nav.collections": () => changeView("collections"),
    "nav.installed": () => changeView("installed"),

    refresh: () => triggerGlobalRefresh(),
    open_settings: () => setSettingsOpen(true),
    toggle_sidebar: () => toggleSidebar(),
    theme_cycle: () => {
      const theme = useAppStore.getState().theme;
      const i = THEME_CODES.indexOf(theme);
      const next = THEME_CODES[(i + 1) % THEME_CODES.length];
      useAppStore.getState().setTheme(next);
      void persistTheme(next);
    },
    open_tasks: () => setTasksOpen(true),
    open_multi_download: () => setMultiOpen(true),
  });

  const activeKey: NavKey | "author" =
    sub.kind === "author"
      ? "author"
      : sub.kind === "collection"
        ? "collections"
        : view;

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground relative">

        <TitleBar />
        <div className="flex flex-1 overflow-hidden z-10">
          <Sidebar current={view} onChange={changeView} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenMulti={() => setMultiOpen(true)}
              onOpenInfo={() => setInfoOpen(true)}
              onOpenTasks={() => setTasksOpen(true)}
            />
            <main className="relative flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {ready && activeKey === "workshop" && (
                  <ViewWrap key="workshop">
                    <WorkshopView />
                  </ViewWrap>
                )}
                {ready && activeKey === "collections" && (
                  <ViewWrap key="collections">
                    <CollectionsView />
                  </ViewWrap>
                )}
                {ready && activeKey === "installed" && (
                  <ViewWrap key="installed">
                    <InstalledView />
                  </ViewWrap>
                )}
                {ready && activeKey === "author" && (
                  <ViewWrap key="author">
                    <AuthorView />
                  </ViewWrap>
                )}
              </AnimatePresence>
              {!ready && <BootLoader />}
            </main>
          </div>
        </div>

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <MultiDownloadDialog open={multiOpen} onOpenChange={setMultiOpen} />
        <InfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          onCheckUpdates={() => setUpdateOpen(true)}
          onOpenLegal={() => setLegalOpen(true)}
        />
        <UpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} />
        <TasksDrawer open={tasksOpen} onOpenChange={setTasksOpen} />
        <LegalDialog
          open={legalOpen}
          onOpenChange={setLegalOpen}
          requireAccept={!legalAccepted}
          onAccept={() => setLegalAccepted(true)}
        />
        <ToastStack />
        <SetupOverlay />
        <MetadataInitDialog />
      </div>
    </MotionConfig>
  );
}

function ViewWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function BootLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
      />
    </div>
  );
}
