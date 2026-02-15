import { create } from "zustand";
import type { Annotation, ProjectConfig, ToolType } from "@/lib/types";

interface AnnotationState {
  config: ProjectConfig | null;
  images: readonly string[];
  currentImage: string | null;
  annotations: readonly Annotation[];
  activeTool: ToolType;
  activeLabel: string;
  selectedAnnotationId: string | null;
}

interface AnnotationActions {
  init: () => Promise<void>;
  setCurrentImage: (filename: string | null) => void;
  previousImage: () => void;
  nextImage: () => void;
  setActiveTool: (tool: ToolType) => void;
  setActiveLabel: (label: string) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  updateAnnotations: (annotations: readonly Annotation[]) => void;
  deleteAnnotation: (id: string) => void;
}

async function saveAnnotationsToApi(currentImage: string, annotations: readonly Annotation[]): Promise<void> {
  const img = new window.Image();
  img.src = `/api/images/${encodeURIComponent(currentImage)}`;
  await new Promise<void>((resolve) => {
    if (img.complete) {
      resolve();
    } else {
      img.onload = () => resolve();
    }
  });

  await fetch(`/api/annotations/${encodeURIComponent(currentImage)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageFile: currentImage,
      width: img.naturalWidth,
      height: img.naturalHeight,
      annotations,
    }),
  });
}

export const useAnnotationStore = create<AnnotationState & AnnotationActions>((set, get) => ({
  // State
  config: null,
  images: [],
  currentImage: null,
  annotations: [],
  activeTool: "bbox",
  activeLabel: "",
  selectedAnnotationId: null,

  // Actions
  init: async () => {
    const [configRes, imagesRes] = await Promise.all([fetch("/api/config"), fetch("/api/images")]);
    const configData: ProjectConfig = await configRes.json();
    const imagesData = await imagesRes.json();

    set({ config: configData, images: imagesData.images });

    if (configData.labels.length > 0) {
      set({ activeLabel: configData.labels[0] });
    }
    if (imagesData.images.length > 0) {
      get().setCurrentImage(imagesData.images[0]);
    }
  },

  setCurrentImage: (filename: string | null) => {
    set({ currentImage: filename, annotations: [], selectedAnnotationId: null });

    if (!filename) return;

    (async () => {
      const res = await fetch(`/api/annotations/${encodeURIComponent(filename)}`);
      const data = await res.json();
      // Staleness guard: only update if still on same image
      if (get().currentImage === filename) {
        set({ annotations: data.annotations || [] });
      }
    })();
  },

  previousImage: () => {
    const { currentImage, images } = get();
    if (!currentImage || images.length === 0) return;
    const idx = images.indexOf(currentImage);
    if (idx > 0) {
      get().setCurrentImage(images[idx - 1]);
    }
  },

  nextImage: () => {
    const { currentImage, images } = get();
    if (!currentImage || images.length === 0) return;
    const idx = images.indexOf(currentImage);
    if (idx < images.length - 1) {
      get().setCurrentImage(images[idx + 1]);
    }
  },

  setActiveTool: (tool: ToolType) => set({ activeTool: tool }),

  setActiveLabel: (label: string) => set({ activeLabel: label }),

  setSelectedAnnotationId: (id: string | null) => set({ selectedAnnotationId: id }),

  updateAnnotations: (annotations: readonly Annotation[]) => {
    const { currentImage } = get();
    set({ annotations });
    if (currentImage) {
      saveAnnotationsToApi(currentImage, annotations);
    }
  },

  deleteAnnotation: (id: string) => {
    const { annotations, selectedAnnotationId, currentImage } = get();
    const updated = annotations.filter((a) => a.id !== id);
    set({
      annotations: updated,
      selectedAnnotationId: selectedAnnotationId === id ? null : selectedAnnotationId,
    });
    if (currentImage) {
      saveAnnotationsToApi(currentImage, updated);
    }
  },
}));
