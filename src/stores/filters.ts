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
  page: 1,
};

interface FiltersState {
  filters: WorkshopFilters;
  showAdvanced: boolean;
  setFilters: (next: Partial<WorkshopFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  toggleAdvanced: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  filters: DEFAULT_FILTERS,
  showAdvanced: false,
  setFilters: (next) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...next,
        page: next.page ?? ("page" in next ? state.filters.page : 1),
      },
    })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setPage: (page) =>
    set((state) => ({ filters: { ...state.filters, page } })),
  toggleAdvanced: () =>
    set((state) => ({ showAdvanced: !state.showAdvanced })),
}));
