"use client";

import { useShallow } from "zustand/react/shallow";
import { SamOverlay } from "@/components/containers/sam-overlay";
import { AnnotationCanvasView } from "@/components/views/annotation-canvas-view";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { useSamStore } from "@/lib/stores/sam-store";
import type { NormalizedCoord } from "@/lib/types";

export function AnnotationCanvas() {
  const { currentImage, annotations, activeTool, activeLabel, selectedAnnotationId } = useAnnotationStore(
    useShallow((s) => ({
      currentImage: s.currentImage,
      annotations: s.annotations,
      activeTool: s.activeTool,
      activeLabel: s.activeLabel,
      selectedAnnotationId: s.selectedAnnotationId,
    })),
  );
  const updateAnnotations = useAnnotationStore((s) => s.updateAnnotations);
  const setSelectedAnnotationId = useAnnotationStore((s) => s.setSelectedAnnotationId);

  const imageUrl = currentImage ? `/api/images/${encodeURIComponent(currentImage)}` : "";

  const handleImageLoad = (width: number, height: number) => {
    useSamStore.getState().setImageDimensions(width, height);
  };

  const handleSamClick = (x: NormalizedCoord, y: NormalizedCoord, clickType: 0 | 1) => {
    useSamStore.getState().addClick({ x, y, clickType });
  };

  return (
    <AnnotationCanvasView
      imageUrl={imageUrl}
      annotations={annotations}
      activeTool={activeTool}
      activeLabel={activeLabel}
      selectedAnnotationId={selectedAnnotationId}
      onAnnotationsChange={updateAnnotations}
      onSelectAnnotation={setSelectedAnnotationId}
      onImageLoad={handleImageLoad}
      onSamClick={handleSamClick}
      samOverlay={<SamOverlay imageWidth={0} imageHeight={0} scale={1} />}
    />
  );
}
