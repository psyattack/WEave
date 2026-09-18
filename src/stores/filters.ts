import { create } from "zustand";

export interface WorkshopFilters {
  search: string;
  sort: string;
  days: string;
  category: string;
  type_tag: string;
  age_rating: string;
  resolution: string;
  misc_tags: string[];
  genre_tags: string[];
  excluded_misc_tags: string[];
  excluded_genre_tags: string[];
  asset_type: string;
  asset_genre: string;
  script_type: string;
  required_flags: string[];
  created_date_range_start: string;
  created_date_range_end: string;
  updated_date_range_start: string;
  updated_date_range_end: string;
  search_text_mode: number;
  page: number;
}

export const DEFAULT_FILTERS: WorkshopFilters = {
  search: "",
  sort: "trend",
  days: "7",
  category: "",
  type_tag: "",
  age_rating: "",
  resolution: "",
  misc_tags: [],
  genre_tags: [],
  excluded_misc_tags: [],
  excluded_genre_tags: [],
  asset_type: "",
  asset_genre: "",
  script_type: "",
  required_flags: [],
  created_date_range_start: "",
  created_date_range_end: "",
  updated_date_range_start: "",
  updated_date_range_end: "",
  search_text_mode: 0,
  page: 1,
};

interface FiltersState {
  filters: WorkshopFilters;
  showAdvanced: boolean;
  showInstalledAdvanced: boolean;
  collapsed: boolean;
  // Separate page state for each view to preserve navigation history
  viewPages: {
    workshop: number;
    collections: number;
    installed: number;
    author: Map<string, number>; // keyed by profileUrl
    collection: Map<string, number>; // keyed by collectionId
  };
  setFilters: (next: Partial<WorkshopFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setViewPage: (view: string, page: number, key?: string) => void;
  getViewPage: (view: string, key?: string) => number;
  setShowAdvanced: (v: boolean) => void;
  toggleAdvanced: () => void;
  setShowInstalledAdvanced: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleInstalledAdvanced: () => void;
  toggleCollapsed: () => void;
}

export const useFiltersStore = create<FiltersState>((set, get) => ({
  filters: DEFAULT_FILTERS,
  showAdvanced: false,
  showInstalledAdvanced: false,
  collapsed: false,
  viewPages: {
    workshop: 1,
    collections: 1,
    installed: 1,
    author: new Map(),
    collection: new Map(),
  },
  setFilters: (next) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...next,
        page: next.page ?? ("page" in next ? state.filters.page : 1),
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setPage: (page) => set((state) => ({ filters: { ...state.filters, page } })),
  setViewPage: (view, page, key) =>
    set((state) => {
      const newViewPages = { ...state.viewPages };
      if (view === "author" && key) {
        newViewPages.author = new Map(state.viewPages.author);
        newViewPages.author.set(key, page);
      } else if (view === "collection" && key) {
        newViewPages.collection = new Map(state.viewPages.collection);
        newViewPages.collection.set(key, page);
      } else if (
        view === "workshop" ||
        view === "collections" ||
        view === "installed"
      ) {
        newViewPages[view] = page;
      }
      return { viewPages: newViewPages };
    }),
  getViewPage: (view, key) => {
    const state = get();
    if (view === "author" && key) {
      return state.viewPages.author.get(key) ?? 1;
    } else if (view === "collection" && key) {
      return state.viewPages.collection.get(key) ?? 1;
    } else if (
      view === "workshop" ||
      view === "collections" ||
      view === "installed"
    ) {
      return state.viewPages[view];
    }
    return 1;
  },
  setShowAdvanced: (showAdvanced) => set({ showAdvanced }),
  toggleAdvanced: () => set((state) => ({ showAdvanced: !state.showAdvanced })),
  setShowInstalledAdvanced: (v) =>
    set((state) => ({
      showInstalledAdvanced:
        typeof v === "function" ? v(state.showInstalledAdvanced) : v,
    })),
  toggleInstalledAdvanced: () =>
    set((state) => ({ showInstalledAdvanced: !state.showInstalledAdvanced })),
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
}));
