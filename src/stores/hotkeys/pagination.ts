import { create } from "zustand";

/**
 * Thin store that the currently-active view writes to so the global hotkey
 * handler knows which pagination context to act on.
 *
 * Each view (Workshop, Collections, Author) mounts a small effect
 * that publishes its page/totalPages/onChange to this store. When the view
 * unmounts it clears itself.
 */

export interface PaginationContext {
  /** Which view is currently active */
  view: string | null;
  /** 1-based current page */
  page: number;
  /** Total pages (>= 1) */
  totalPages: number;
  /** Change to page N (1-based) */
  onChange: ((page: number) => void) | null;
}

interface PaginationStore extends PaginationContext {
  publish: (ctx: PaginationContext) => void;
  clear: (view: string) => void;
}

export const usePaginationCtx = create<PaginationStore>((set, get) => ({
  view: null,
  page: 1,
  totalPages: 1,
  onChange: null,

  publish: (ctx) => {
    const current = get().view;
    if (current === null || current === ctx.view) {
      set(ctx);
    }
  },

  clear: (view) => {
    if (get().view === view) {
      set({ view: null, page: 1, totalPages: 1, onChange: null });
    }
  },
}));

export function pagePrev() {
  const { page, onChange } = usePaginationCtx.getState();
  if (onChange && page > 1) onChange(page - 1);
}

export function pageNext() {
  const { page, totalPages, onChange } = usePaginationCtx.getState();
  if (onChange && page < totalPages) onChange(page + 1);
}

export function pageFirst() {
  const { onChange } = usePaginationCtx.getState();
  if (onChange) onChange(1);
}

export function pageLast() {
  const { totalPages, onChange } = usePaginationCtx.getState();
  if (onChange) onChange(totalPages);
}
