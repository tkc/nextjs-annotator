"use client";

import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { createBBox, createPoint, createPolygon } from "@/lib/annotation-factory";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { useSamStore } from "@/lib/stores/sam-store";
import {
  type BBoxAnnotation,
  type NormalizedCoord,
  normalizedCoord,
  type PointAnnotation,
  type PolygonAnnotation,
  toNormalized,
  toPixel,
} from "@/lib/types";
import { SamOverlay } from "./sam-overlay";

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

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingBBox, setDrawingBBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedShapeRef = useRef<Konva.Node | null>(null);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      useSamStore.getState().setImageDimensions(img.width, img.height);
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
        setStageSize({ width: containerWidth, height: containerHeight });
        setPosition({
          x: (containerWidth - img.width * newScale) / 2,
          y: (containerHeight - img.height * newScale) / 2,
        });
      }
    };
  }, [imageUrl]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Attach transformer to selected shape
  useEffect(() => {
    if (transformerRef.current) {
      if (selectedAnnotationId && selectedShapeRef.current) {
        transformerRef.current.nodes([selectedShapeRef.current]);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedAnnotationId]);

  const getRelativePointerPosition = useCallback((): { x: NormalizedCoord; y: NormalizedCoord } | null => {
    const stage = stageRef.current;
    if (!stage || !image) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: toNormalized((pointer.x - position.x) / scale, image.width),
      y: toNormalized((pointer.y - position.y) / scale, image.height),
    };
  }, [position, scale, image]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
      const clampedScale = Math.max(0.1, Math.min(10, newScale));

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      setScale(clampedScale);
      setPosition({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    },
    [scale, position],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!image) return;

      // Right click or middle click - ignore (except SAM tool uses right click for background)
      if (e.evt.button === 1) return;
      if (e.evt.button === 2 && activeTool !== "sam") return;

      const pos = getRelativePointerPosition();
      if (!pos) return;

      if (activeTool === "select") {
        // Clicking on empty area deselects
        if (e.target === e.target.getStage() || e.target.getClassName() === "Image") {
          setSelectedAnnotationId(null);
        }
        return;
      }

      if (activeTool === "bbox") {
        setIsDrawing(true);
        setDrawingBBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
        return;
      }

      if (activeTool === "point") {
        const newPoint = createPoint(activeLabel, pos.x, pos.y);
        updateAnnotations([...annotations, newPoint]);
        return;
      }

      if (activeTool === "polygon") {
        // Double click closes polygon
        if (e.evt.detail === 2 && polygonPoints.length >= 6) {
          const newPolygon = createPolygon(activeLabel, polygonPoints);
          updateAnnotations([...annotations, newPolygon]);
          setPolygonPoints([]);
          return;
        }
        setPolygonPoints([...polygonPoints, pos.x, pos.y]);
        return;
      }

      if (activeTool === "sam") {
        const clickType = e.evt.button === 2 ? 0 : 1; // right=background(0), left=foreground(1)
        useSamStore.getState().addClick({ x: pos.x, y: pos.y, clickType: clickType as 0 | 1 });
        return;
      }
    },
    [
      image,
      activeTool,
      activeLabel,
      annotations,
      polygonPoints,
      getRelativePointerPosition,
      updateAnnotations,
      setSelectedAnnotationId,
    ],
  );

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || activeTool !== "bbox" || !drawingBBox || !image) return;
      const pos = getRelativePointerPosition();
      if (!pos) return;

      setDrawingBBox({
        ...drawingBBox,
        width: pos.x - drawingBBox.x,
        height: pos.y - drawingBBox.y,
      });
    },
    [isDrawing, activeTool, drawingBBox, image, getRelativePointerPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || activeTool !== "bbox" || !drawingBBox) return;
    setIsDrawing(false);

    // Normalize negative width/height
    const x = drawingBBox.width < 0 ? drawingBBox.x + drawingBBox.width : drawingBBox.x;
    const y = drawingBBox.height < 0 ? drawingBBox.y + drawingBBox.height : drawingBBox.y;
    const width = Math.abs(drawingBBox.width);
    const height = Math.abs(drawingBBox.height);

    // Ignore tiny boxes
    if (width < 0.005 || height < 0.005) {
      setDrawingBBox(null);
      return;
    }

    const newBBox = createBBox(activeLabel, x, y, width, height);
    updateAnnotations([...annotations, newBBox]);
    setDrawingBBox(null);
  }, [isDrawing, activeTool, drawingBBox, activeLabel, annotations, updateAnnotations]);

  const handleShapeClick = useCallback(
    (id: string, nodeRef: Konva.Node) => {
      if (activeTool === "select") {
        setSelectedAnnotationId(id);
        selectedShapeRef.current = nodeRef;
      }
    },
    [activeTool, setSelectedAnnotationId],
  );

  const handleTransformEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      if (!image) return;
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const updated = annotations.map((ann) => {
        if (ann.id !== id || ann.type !== "bbox") return ann;
        return {
          ...ann,
          x: toNormalized(node.x(), image.width),
          y: toNormalized(node.y(), image.height),
          width: normalizedCoord(Math.max(0.005, (node.width() * scaleX) / image.width)),
          height: normalizedCoord(Math.max(0.005, (node.height() * scaleY) / image.height)),
        };
      });
      updateAnnotations(updated);
    },
    [annotations, image, updateAnnotations],
  );

  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!image) return;
      const node = e.target;

      const updated = annotations.map((ann) => {
        if (ann.id !== id) return ann;
        if (ann.type === "bbox") {
          return { ...ann, x: toNormalized(node.x(), image.width), y: toNormalized(node.y(), image.height) };
        }
        if (ann.type === "point") {
          return { ...ann, x: toNormalized(node.x(), image.width), y: toNormalized(node.y(), image.height) };
        }
        return ann;
      });
      updateAnnotations(updated);
    },
    [annotations, image, updateAnnotations],
  );

  // Color per label
  const labelColors: Record<string, string> = {};
  const palette = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"] as const;
  const uniqueLabels = [...new Set(annotations.map((a) => a.label))];
  uniqueLabels.forEach((label, i) => {
    labelColors[label] = palette[i % palette.length];
  });
  if (!labelColors[activeLabel]) {
    labelColors[activeLabel] = palette[uniqueLabels.length % palette.length];
  }

  const imgWidth = image?.width || 1;
  const imgHeight = image?.height || 1;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Canvas container needs onContextMenu to prevent browser default
    <div ref={containerRef} className="flex-1 bg-neutral-900 overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        draggable={activeTool === "select"}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
        style={{ cursor: activeTool === "select" ? "grab" : activeTool === "sam" ? "cell" : "crosshair" }}
      >
        <Layer>
          {image && <KonvaImage image={image} width={imgWidth} height={imgHeight} />}

          {/* Render BBox annotations */}
          {annotations
            .filter((a): a is BBoxAnnotation => a.type === "bbox")
            .map((ann) => (
              <Rect
                key={ann.id}
                x={toPixel(ann.x, imgWidth)}
                y={toPixel(ann.y, imgHeight)}
                width={toPixel(ann.width, imgWidth)}
                height={toPixel(ann.height, imgHeight)}
                stroke={labelColors[ann.label] || "#FF0000"}
                strokeWidth={2 / scale}
                draggable={activeTool === "select"}
                onClick={(e) => handleShapeClick(ann.id, e.target)}
                onTap={(e) => handleShapeClick(ann.id, e.target)}
                onDragEnd={(e) => handleDragEnd(ann.id, e)}
                onTransformEnd={(e) => handleTransformEnd(ann.id, e)}
                ref={(node) => {
                  if (node && ann.id === selectedAnnotationId) {
                    selectedShapeRef.current = node;
                  }
                }}
              />
            ))}

          {/* Render Polygon annotations */}
          {annotations
            .filter((a): a is PolygonAnnotation => a.type === "polygon")
            .map((ann) => (
              <Line
                key={ann.id}
                points={ann.points.map((p, i) => (i % 2 === 0 ? toPixel(p, imgWidth) : toPixel(p, imgHeight)))}
                stroke={labelColors[ann.label] || "#FF0000"}
                strokeWidth={2 / scale}
                closed
                fill={`${labelColors[ann.label] || "#FF0000"}33`}
                onClick={(e) => handleShapeClick(ann.id, e.target)}
                onTap={(e) => handleShapeClick(ann.id, e.target)}
              />
            ))}

          {/* Render Point annotations */}
          {annotations
            .filter((a): a is PointAnnotation => a.type === "point")
            .map((ann) => (
              <Circle
                key={ann.id}
                x={toPixel(ann.x, imgWidth)}
                y={toPixel(ann.y, imgHeight)}
                radius={5 / scale}
                fill={labelColors[ann.label] || "#FF0000"}
                stroke="white"
                strokeWidth={1 / scale}
                draggable={activeTool === "select"}
                onClick={(e) => handleShapeClick(ann.id, e.target)}
                onTap={(e) => handleShapeClick(ann.id, e.target)}
                onDragEnd={(e) => handleDragEnd(ann.id, e)}
              />
            ))}

          {/* Drawing in-progress BBox */}
          {drawingBBox && (
            <Rect
              x={drawingBBox.x * imgWidth}
              y={drawingBBox.y * imgHeight}
              width={drawingBBox.width * imgWidth}
              height={drawingBBox.height * imgHeight}
              /* drawingBBox は描画中の一時状態 (まだ確定前) なので素の number */
              stroke={labelColors[activeLabel] || "#FF0000"}
              strokeWidth={2 / scale}
              dash={[4 / scale, 4 / scale]}
            />
          )}

          {/* Drawing in-progress Polygon */}
          {polygonPoints.length >= 2 && (
            <>
              <Line
                points={polygonPoints.map((p, i) =>
                  /* polygonPoints は描画中の一時状態なので素の number のまま */
                  i % 2 === 0 ? p * imgWidth : p * imgHeight,
                )}
                stroke={labelColors[activeLabel] || "#FF0000"}
                strokeWidth={2 / scale}
                dash={[4 / scale, 4 / scale]}
              />
              {Array.from({ length: polygonPoints.length / 2 }).map((_, i) => (
                <Circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: Polygon vertices are positional, no stable ID available
                  key={`poly-pt-${i}`}
                  x={polygonPoints[i * 2] * imgWidth}
                  y={polygonPoints[i * 2 + 1] * imgHeight}
                  radius={4 / scale}
                  fill={labelColors[activeLabel] || "#FF0000"}
                  stroke="white"
                  strokeWidth={1 / scale}
                />
              ))}
            </>
          )}

          {/* SAM mask overlay and click points */}
          {activeTool === "sam" && <SamOverlay imageWidth={imgWidth} imageHeight={imgHeight} scale={scale} />}

          {/* Transformer for selected bbox */}
          {activeTool === "select" && (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
