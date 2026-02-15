"use client";

import { useShallow } from "zustand/react/shallow";
import { SamOverlayView } from "@/components/views/sam-overlay-view";
import { useSamStore } from "@/lib/stores/sam-store";

interface SamOverlayProps {
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

export function SamOverlay({ imageWidth, imageHeight, scale }: SamOverlayProps) {
  const { clicks, currentMask, isProcessing, error } = useSamStore(
    useShallow((s) => ({
      clicks: s.clicks,
      currentMask: s.currentMask,
      isProcessing: s.isProcessing,
      error: s.error,
    })),
  );

  return (
    <SamOverlayView
      maskData={currentMask ? { mask: currentMask.mask, width: currentMask.width, height: currentMask.height } : null}
      clicks={clicks}
      iouScore={currentMask?.iouScore ?? 0}
      isProcessing={isProcessing}
      error={error}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      scale={scale}
    />
  );
}
