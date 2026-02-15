import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Text } from "react-konva";

export interface SamClick {
  x: number;
  y: number;
  clickType: 0 | 1;
}

export interface SamOverlayViewProps {
  maskData: { mask: Float32Array; width: number; height: number } | null;
  clicks: SamClick[];
  iouScore: number;
  isProcessing: boolean;
  error: string | null;
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
      data[offset] = 0;
      data[offset + 1] = 114;
      data[offset + 2] = 189;
      data[offset + 3] = 100;
    } else {
      data[offset + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const img = new window.Image();
  img.src = canvas.toDataURL();
  return img;
}

export function SamOverlayView({
  maskData,
  clicks,
  iouScore,
  isProcessing,
  error,
  imageWidth,
  imageHeight,
  scale,
}: SamOverlayViewProps) {
  const [maskImage, setMaskImage] = useState<HTMLImageElement | null>(null);
  const prevMaskRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!maskData) {
      setMaskImage(null);
      prevMaskRef.current = null;
      return;
    }

    if (prevMaskRef.current === maskData.mask) return;
    prevMaskRef.current = maskData.mask;

    const img = maskToImageElement(maskData.mask, maskData.width, maskData.height);
    if (img) {
      if (img.complete) {
        setMaskImage(img);
      } else {
        img.onload = () => setMaskImage(img);
      }
    }
  }, [maskData]);

  return (
    <Group>
      {maskImage && <KonvaImage image={maskImage} width={imageWidth} height={imageHeight} listening={false} />}

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
