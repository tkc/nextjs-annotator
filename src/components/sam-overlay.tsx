"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Text } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useSamStore } from "@/lib/stores/sam-store";

interface SamOverlayProps {
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

/** Convert logit mask to a semi-transparent blue HTMLImageElement */
function maskToImageElement(mask: Float32Array, width: number, height: number): HTMLImageElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < mask.length; i++) {
    const offset = i * 4;
    if (mask[i] > 0) {
      // Semi-transparent blue: rgba(0, 114, 189, 100/255)
      data[offset] = 0; // R
      data[offset + 1] = 114; // G
      data[offset + 2] = 189; // B
      data[offset + 3] = 100; // A
    } else {
      data[offset + 3] = 0; // Transparent
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const img = new window.Image();
  img.src = canvas.toDataURL();
  return img;
}

export function SamOverlay({ imageWidth, imageHeight, scale }: SamOverlayProps) {
  const { clicks, currentMask, isProcessing, error, iouScore } = useSamStore(
    useShallow((s) => ({
      clicks: s.clicks,
      currentMask: s.currentMask,
      isProcessing: s.isProcessing,
      error: s.error,
      iouScore: s.currentMask?.iouScore ?? 0,
    })),
  );

  const [maskImage, setMaskImage] = useState<HTMLImageElement | null>(null);
  const prevMaskRef = useRef<Float32Array | null>(null);

  // Regenerate mask image when mask data changes
  useEffect(() => {
    if (!currentMask) {
      setMaskImage(null);
      prevMaskRef.current = null;
      return;
    }

    // Skip if same mask reference
    if (prevMaskRef.current === currentMask.mask) return;
    prevMaskRef.current = currentMask.mask;

    const img = maskToImageElement(currentMask.mask, currentMask.width, currentMask.height);
    if (img) {
      if (img.complete) {
        setMaskImage(img);
      } else {
        img.onload = () => setMaskImage(img);
      }
    }
  }, [currentMask]);

  return (
    <Group>
      {/* Mask overlay */}
      {maskImage && <KonvaImage image={maskImage} width={imageWidth} height={imageHeight} listening={false} />}

      {/* Click points */}
      {clicks.map((click, i) => (
        <Circle
          // biome-ignore lint/suspicious/noArrayIndexKey: Click points are positional, no stable ID
          key={`sam-click-${i}`}
          x={click.x * imageWidth}
          y={click.y * imageHeight}
          radius={6 / scale}
          fill={click.clickType === 1 ? "#22c55e" : "#ef4444"}
          stroke="white"
          strokeWidth={2 / scale}
          listening={false}
        />
      ))}

      {/* Status text */}
      {clicks.length > 0 && (
        <Text
          x={4 / scale}
          y={4 / scale}
          text={
            isProcessing
              ? "Processing..."
              : error
                ? `Error: ${error}`
                : `Clicks: ${clicks.length} | IoU: ${iouScore.toFixed(3)} | Enter=Confirm Esc=Reset Ctrl+Z=Undo`
          }
          fontSize={14 / scale}
          fill="white"
          shadowColor="black"
          shadowBlur={4}
          shadowOffsetX={1}
          shadowOffsetY={1}
          listening={false}
        />
      )}
    </Group>
  );
}
