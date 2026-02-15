import { create } from "zustand";
import { loadDecoder, runDecoder, type SamClick, type SamResult } from "@/lib/sam/sam-decoder";

interface SamState {
  isDecoderLoaded: boolean;
  embedding: Float32Array | null;
  isLoadingEmbedding: boolean;
  clicks: SamClick[];
  currentMask: SamResult | null;
  lowResMask: Float32Array | null;
  isProcessing: boolean;
  error: string | null;
  /** Original image dimensions needed for decoder */
  imageWidth: number;
  imageHeight: number;
}

interface SamActions {
  initDecoder: () => Promise<void>;
  loadEmbedding: (filename: string) => Promise<void>;
  addClick: (click: SamClick) => Promise<void>;
  removeLastClick: () => Promise<void>;
  clearClicks: () => void;
  reset: () => void;
  setImageDimensions: (width: number, height: number) => void;
}

const initialState: SamState = {
  isDecoderLoaded: false,
  embedding: null,
  isLoadingEmbedding: false,
  clicks: [],
  currentMask: null,
  lowResMask: null,
  isProcessing: false,
  error: null,
  imageWidth: 0,
  imageHeight: 0,
};

async function runDecoderWithState(state: SamState): Promise<SamResult | null> {
  if (!state.embedding || state.clicks.length === 0) return null;
  return runDecoder(state.embedding, state.clicks, state.imageWidth, state.imageHeight, state.lowResMask ?? undefined);
}

export const useSamStore = create<SamState & SamActions>((set, get) => ({
  ...initialState,

  initDecoder: async () => {
    try {
      await loadDecoder();
      set({ isDecoderLoaded: true, error: null });
    } catch (e) {
      set({ error: `Failed to load SAM decoder: ${e instanceof Error ? e.message : String(e)}` });
    }
  },

  loadEmbedding: async (filename: string) => {
    set({ isLoadingEmbedding: true, error: null });
    try {
      const res = await fetch("/api/sam/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) throw new Error(`Embedding API returned ${res.status}`);

      const buffer = await res.arrayBuffer();
      set({ embedding: new Float32Array(buffer), isLoadingEmbedding: false });
    } catch (e) {
      set({
        isLoadingEmbedding: false,
        error: `Failed to load embedding: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },

  addClick: async (click: SamClick) => {
    const clicks = [...get().clicks, click];
    set({ clicks, isProcessing: true, error: null });
    try {
      const result = await runDecoderWithState({ ...get(), clicks });
      set({ currentMask: result, isProcessing: false });
    } catch (e) {
      set({
        isProcessing: false,
        error: `Decoder error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },

  removeLastClick: async () => {
    const clicks = get().clicks.slice(0, -1);
    set({ clicks });

    if (clicks.length === 0) {
      set({ currentMask: null, isProcessing: false });
      return;
    }

    set({ isProcessing: true, error: null });
    try {
      const result = await runDecoderWithState({ ...get(), clicks });
      set({ currentMask: result, isProcessing: false });
    } catch (e) {
      set({
        isProcessing: false,
        error: `Decoder error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  },

  clearClicks: () => {
    set({ clicks: [], currentMask: null, lowResMask: null, isProcessing: false });
  },

  reset: () => {
    set({ ...initialState, isDecoderLoaded: get().isDecoderLoaded });
  },

  setImageDimensions: (width: number, height: number) => {
    set({ imageWidth: width, imageHeight: height });
  },
}));
