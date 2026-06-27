import { create } from "zustand";
import { useAppStore } from "./app";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// Drop duplicates of the same message+kind that arrive within this many
// ms — covers React strict-mode double-effects, redundant emits from the
// backend, and accidental double-clicks.
const DEDUP_WINDOW_MS = 1500;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ kind = "info", message, duration = 3500 }) => {
    // Suppress toasts if TasksDrawer or DetailsSidebar is open to prevent duplicate info overlay
    const state = useAppStore.getState();
    if (state.tasksOpen || state.detailsOpen) {
      return "suppressed";
    }
    const now = Date.now();
    const existing = get().toasts.find(
      (t) =>
        t.message === message &&
        t.kind === kind &&
        now - parseInt(t.id.split("-")[0] ?? "0", 10) < DEDUP_WINDOW_MS,
    );
    if (existing) return existing.id;
    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, kind, message, duration }],
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  dismissAll: () => set({ toasts: [] }),
}));

export function pushToast(
  message: string,
  kind: ToastKind = "info",
  duration?: number,
) {
  return useToastStore.getState().push({ message, kind, duration });
}

export function dismissAllToasts() {
  useToastStore.getState().dismissAll();
}
