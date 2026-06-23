import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { applyThemeClass } from "@/hooks/useTheme";

export type ThemeCode = "dark" | "light" | "nord" | "monokai" | "solarized";

interface AppState {
  ready: boolean;
  language: string;
  theme: ThemeCode;
  accent: string;
  weDirectory: string;
  availableLanguages: { code: string; label: string }[];
  accountIndex: number;
  accounts: { index: number; username: string; is_custom: boolean }[];
  sidebarCollapsed: boolean;
  legalAccepted: boolean;
  lowPerformance: boolean;
  enable3dCards: boolean;
  enableLayoutAnimations: boolean;
  activeDetailsCover: string | null;
  showLoginPromptOnFail: boolean;
  loginModalOpen: boolean;
  loginModalMode: "auto" | "manual";
  setReady: (v: boolean) => void;
  setLanguage: (lang: string) => void;
  setTheme: (theme: ThemeCode) => void;
  setAccent: (accent: string) => void;
  setWeDirectory: (dir: string) => void;
  setAvailableLanguages: (list: { code: string; label: string }[]) => void;
  setAccountIndex: (index: number) => void;
  setAccounts: (
    accounts: { index: number; username: string; is_custom: boolean }[],
  ) => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setLegalAccepted: (v: boolean) => void;
  setLowPerformance: (v: boolean) => void;
  setEnable3dCards: (v: boolean) => void;
  setEnableLayoutAnimations: (v: boolean) => void;
  setActiveDetailsCover: (v: string | null) => void;
  setShowLoginPromptOnFail: (v: boolean) => void;
  setLoginModalOpen: (open: boolean, mode?: "auto" | "manual") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ready: false,
      language: "en",
      theme: "dark",
      accent: "indigo",
      weDirectory: "",
      availableLanguages: [
        { code: "en", label: "English" },
        { code: "ru", label: "Русский" },
      ],
      accountIndex: 3,
      accounts: [],
      sidebarCollapsed: false,
      legalAccepted: false,
      lowPerformance: false,
      enable3dCards: true,
      enableLayoutAnimations: false,
      activeDetailsCover: null,
      showLoginPromptOnFail: true,
      loginModalOpen: false,
      loginModalMode: "manual",
      setReady: (v) => set({ ready: v }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          applyThemeClass(theme);
        }
      },
      setAccent: (accent) => set({ accent }),
      setWeDirectory: (weDirectory) => set({ weDirectory }),
      setAvailableLanguages: (availableLanguages) =>
         set({ availableLanguages }),
      setAccountIndex: (accountIndex) => set({ accountIndex }),
      setAccounts: (accounts) => set({ accounts }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setLegalAccepted: (legalAccepted) => set({ legalAccepted }),
      setLowPerformance: (lowPerformance) => set({ lowPerformance }),
      setEnable3dCards: (enable3dCards) => set({ enable3dCards }),
      setEnableLayoutAnimations: (enableLayoutAnimations) => set({ enableLayoutAnimations }),
      setActiveDetailsCover: (activeDetailsCover) => set({ activeDetailsCover }),
      setShowLoginPromptOnFail: (showLoginPromptOnFail) => set({ showLoginPromptOnFail }),
      setLoginModalOpen: (loginModalOpen, mode) => set(s => ({ loginModalOpen, loginModalMode: mode || s.loginModalMode })),
    }),
    {
      name: "weave.ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language,
        accent: state.accent,
        legalAccepted: state.legalAccepted,
        lowPerformance: state.lowPerformance,
        enable3dCards: state.enable3dCards,
        enableLayoutAnimations: state.enableLayoutAnimations,
        showLoginPromptOnFail: state.showLoginPromptOnFail,
      }),
    },
  ),
);
