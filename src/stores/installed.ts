import { create } from "zustand";

import { inTauri, tryInvoke } from "@/lib/tauri";
import type { InstalledWallpaper } from "@/types/workshop";

/**
 * Global cache of currently-installed wallpapers, keyed by pubfileid.
 *
 * Workshop / Collection / Author cards consult this cache to:
 *   1. Render an "Installed" indicator on cards (a small ✓ badge).
 *   2. Switch the card's primary action from "Install" → "Apply" so the
 *      DetailsPanel for an item that's *already on disk* matches the
 *      Installed-mode panel even outside the Installed tab.
 */
interface InstalledState {
  byId: Record<string, InstalledWallpaper>;
  ready: boolean;
  updateCounter: number;
  refresh: () => Promise<void>;
  setAll: (items: InstalledWallpaper[]) => void;
  isInstalled: (pubfileid: string) => boolean;
  get: (pubfileid: string) => InstalledWallpaper | undefined;
  addOptimistic: (pubfileid: string, wallpaper: InstalledWallpaper) => void;
  removeOptimistic: (pubfileid: string) => void;
}

export const useInstalledStore = create<InstalledState>((set, get) => ({
  byId: {},
  ready: false,
  updateCounter: 0,
  setAll: (items) => {
    const byId: Record<string, InstalledWallpaper> = {};
    for (const w of items) byId[w.pubfileid] = w;
    set((state) => ({
      byId,
      ready: true,
      updateCounter: state.updateCounter + 1,
    }));
  },
  refresh: async () => {
    if (!inTauri) {
      set({ ready: true });
      return;
    }
    const items = await tryInvoke<InstalledWallpaper[]>(
      "we_list_installed",
      undefined,
      [],
    );
    get().setAll(items ?? []);
  },
  isInstalled: (pubfileid) => Boolean(get().byId[pubfileid]),
  get: (pubfileid) => get().byId[pubfileid],
  addOptimistic: (pubfileid, wallpaper) => {
    set((state) => ({
      byId: { ...state.byId, [pubfileid]: wallpaper },
    }));
  },
  removeOptimistic: (pubfileid) => {
    set((state) => {
      const { [pubfileid]: _, ...rest } = state.byId;
      return { byId: rest };
    });
  },
}));
