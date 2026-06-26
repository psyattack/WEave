import { create } from "zustand";

type MetadataInitPhase = "idle" | "initializing" | "complete" | "error";

interface MetadataInitStatus {
  phase: MetadataInitPhase;
  message: string;
  progress: number | null;
  total: number | null;
}

interface MetadataInitStore {
  status: MetadataInitStatus | null;
  setStatus: (status: MetadataInitStatus | null) => void;
}

export const useMetadataInitStore = create<MetadataInitStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));
