import { create } from "zustand";

export type DotnetPhase =
  | "checking"
  | "downloading"
  | "extracting"
  | "ready"
  | "error";

interface DotnetStatus {
  phase: DotnetPhase;
  message: string;
  progress: number | null;
}

interface DotnetStore {
  status: DotnetStatus | null;
  setStatus: (status: DotnetStatus | null) => void;
}

export const useDotnetStore = create<DotnetStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
