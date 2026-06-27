import { create } from "zustand";

type SetupPhase =
  | "checking"
  | "downloading"
  | "extracting"
  | "ready"
  | "error";

type PluginPhase = SetupPhase;

interface DotnetStatus {
  phase: SetupPhase;
  message: string;
  progress: number | null;
}

export interface PluginStatus {
  phase: PluginPhase;
  plugin_id: string;
  plugin_name: string;
  message: string;
  progress: number | null;
}

interface SetupEntry {
  key: string;
  phase: SetupPhase;
  message: string;
  progress: number | null;
}

interface SetupStore {
  queue: SetupEntry[];
  overallProgress: number;
  currentMessage: string;
  currentPhase: SetupPhase | null;
  setStatus: (status: DotnetStatus) => void;
  setPluginStatus: (status: PluginStatus) => void;
  hide: () => void;
}

const DOTNET_READY_KEY = "weave.dotnet.ready";

function computeProgress(queue: SetupEntry[]): number {
  if (queue.length === 0) return 0;

  const doneCount = queue.filter(
    (e) => e.phase === "ready" || e.phase === "error",
  ).length;
  const total = queue.length;
  if (total === 0) return 0;
  const perOp = 100 / total;

  const firstActive = queue.find(
    (e) => e.phase !== "ready" && e.phase !== "error",
  );
  const currentPct = firstActive?.progress ?? 0;

  return Math.min(100, doneCount * perOp + (currentPct / 100) * perOp);
}

function getCurrentState(queue: SetupEntry[]) {
  const active = queue.find((e) => e.phase !== "ready" && e.phase !== "error");
  if (active) {
    return { message: active.message, phase: active.phase };
  }
  if (queue.length > 0) {
    const last = queue[queue.length - 1];
    return { message: last.message, phase: last.phase };
  }
  return { message: "", phase: null };
}

export const useDotnetStore = create<SetupStore>((set, get) => ({
  queue: [],
  overallProgress: 0,
  currentMessage: "",
  currentPhase: null,

  setStatus: (status: DotnetStatus) => {
    const queue = [...get().queue];
    const key = "dotnet";
    const idx = queue.findIndex((e) => e.key === key);

    if (status.phase === "ready") {
      localStorage.setItem(DOTNET_READY_KEY, "true");
    }

    const entry: SetupEntry = { key, ...status };
    if (idx !== -1) {
      queue[idx] = entry;
    } else {
      queue.push(entry);
    }

    set({
      queue,
      overallProgress: computeProgress(queue),
      ...getCurrentState(queue),
    });
  },

  setPluginStatus: (status: PluginStatus) => {
    const queue = [...get().queue];
    const key = status.plugin_id;
    const idx = queue.findIndex((e) => e.key === key);

    const entry: SetupEntry = {
      key,
      phase: status.phase,
      message: status.message,
      progress: status.progress,
    };
    if (idx !== -1) {
      queue[idx] = entry;
    } else {
      queue.push(entry);
    }

    set({
      queue,
      overallProgress: computeProgress(queue),
      ...getCurrentState(queue),
    });
  },

  hide: () => {
    set({
      queue: [],
      overallProgress: 0,
      currentMessage: "",
      currentPhase: null,
    });
  },
}));
