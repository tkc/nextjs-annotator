# Image Annotation Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js + react-konva + shadcn/ui で ML訓練データ作成用の画像アノテーションツールを構築する

**Architecture:** Next.js App Router でページ構成。react-konva (Client Component) で Canvas 上にアノテーション描画。Route Handlers でローカルファイルシステム上の画像読み込みとアノテーション JSON の読み書き。COCO JSON / YOLO TXT エクスポート対応。

**Tech Stack:** Next.js (App Router), react-konva, konva, shadcn/ui, Tailwind CSS, ファイルベース保存 (JSON)

---

### Task 1: Next.js プロジェクト初期化

**Files:**
- Create: プロジェクト全体 (`create-next-app`)

**Step 1: Next.js プロジェクトを作成**

```bash
cd /Users/tkc/github/next-js-2026
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack
```

**Step 2: 動作確認**

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスし、デフォルトページ表示を確認。Ctrl+C で停止。

**Step 3: コミット**

```bash
git add -A
git commit -m "feat: initialize Next.js project"
```

---

### Task 2: shadcn/ui セットアップ

**Files:**
- Modify: `components.json` (自動生成)
- Create: `src/components/ui/*` (自動生成)

**Step 1: shadcn/ui 初期化**

```bash
npx shadcn@latest init -d
```

**Step 2: コンポーネント追加**

```bash
npx shadcn@latest add button input label select badge scroll-area separator tooltip
```

**Step 3: コミット**

```bash
git add -A
git commit -m "feat: add shadcn/ui components"
```

---

### Task 3: react-konva と依存パッケージのインストール

**Files:**
- Modify: `package.json`

**Step 1: パッケージインストール**

```bash
npm install react-konva konva uuid
npm install -D @types/uuid
```

**Step 2: コミット**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-konva, konva, uuid dependencies"
```

---

### Task 4: 型定義

**Files:**
- Create: `src/lib/types.ts`

**Step 1: 型定義ファイルを作成**

`src/lib/types.ts`:

```typescript
export type AnnotationType = "bbox" | "polygon" | "point";
export type ToolType = AnnotationType | "select";

export interface BBoxAnnotation {
  id: string;
  type: "bbox";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonAnnotation {
  id: string;
  type: "polygon";
  label: string;
  points: number[]; // [x1, y1, x2, y2, ...] 正規化座標
}

export interface PointAnnotation {
  id: string;
  type: "point";
  label: string;
  x: number;
  y: number;
}

export type Annotation = BBoxAnnotation | PolygonAnnotation | PointAnnotation;

export interface ImageAnnotation {
  imageFile: string;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface ProjectConfig {
  imageDir: string;
  outputDir: string;
  labels: string[];
}
```

**Step 2: コミット**

```bash
git add src/lib/types.ts
git commit -m "feat: add annotation type definitions"
```

---

### Task 5: プロジェクト設定ファイル

**Files:**
- Create: `annotation-config.json`

**Step 1: 設定ファイルを作成**

`annotation-config.json`:

```json
{
  "imageDir": "./data/images",
  "outputDir": "./data/annotations",
  "labels": ["car", "person", "dog", "cat", "bicycle"]
}
```

**Step 2: データディレクトリを作成**

```bash
mkdir -p data/images data/annotations
```

**Step 3: テスト用のダミー画像を用意する案内**

`data/images/` にアノテーションしたい画像ファイル (jpg/png) を配置する。テスト用にサンプル画像を1枚以上入れておく。

**Step 4: コミット**

```bash
echo "data/images/*" >> .gitignore
echo "!data/images/.gitkeep" >> .gitignore
echo "data/annotations/*" >> .gitignore
echo "!data/annotations/.gitkeep" >> .gitignore
touch data/images/.gitkeep data/annotations/.gitkeep
git add annotation-config.json data/images/.gitkeep data/annotations/.gitkeep .gitignore
git commit -m "feat: add project config and data directories"
```

---

### Task 6: API Route — 画像一覧取得

**Files:**
- Create: `src/app/api/images/route.ts`

**Step 1: Route Handler を作成**

`src/app/api/images/route.ts`:

```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export async function GET() {
  const config = getConfig();
  const imageDir = path.resolve(process.cwd(), config.imageDir);

  if (!fs.existsSync(imageDir)) {
    return NextResponse.json({ images: [] });
  }

  const files = fs.readdirSync(imageDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".bmp"].includes(ext);
  });

  files.sort();
  return NextResponse.json({ images: files });
}
```

**Step 2: コミット**

```bash
git add src/app/api/images/route.ts
git commit -m "feat: add image listing API route"
```

---

### Task 7: API Route — 画像配信

**Files:**
- Create: `src/app/api/images/[filename]/route.ts`

**Step 1: 画像配信 Route Handler を作成**

`src/app/api/images/[filename]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const config = getConfig();
  const imagePath = path.resolve(
    process.cwd(),
    config.imageDir,
    filename
  );

  if (!fs.existsSync(imagePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(imagePath);

  return new NextResponse(buffer, {
    headers: { "Content-Type": contentType },
  });
}
```

**Step 2: コミット**

```bash
git add "src/app/api/images/[filename]/route.ts"
git commit -m "feat: add image serving API route"
```

---

### Task 8: API Route — アノテーション読み書き

**Files:**
- Create: `src/app/api/annotations/[filename]/route.ts`

**Step 1: アノテーション CRUD Route Handler を作成**

`src/app/api/annotations/[filename]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ImageAnnotation } from "@/lib/types";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function getAnnotationPath(imageFile: string): string {
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  const baseName = path.basename(imageFile, path.extname(imageFile));
  return path.join(outputDir, `${baseName}.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const annotationPath = getAnnotationPath(filename);

  if (!fs.existsSync(annotationPath)) {
    const empty: ImageAnnotation = {
      imageFile: filename,
      width: 0,
      height: 0,
      annotations: [],
    };
    return NextResponse.json(empty);
  }

  const data = JSON.parse(fs.readFileSync(annotationPath, "utf-8"));
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const annotationPath = getAnnotationPath(filename);
  const body: ImageAnnotation = await request.json();

  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(annotationPath, JSON.stringify(body, null, 2));
  return NextResponse.json({ success: true });
}
```

**Step 2: コミット**

```bash
git add "src/app/api/annotations/[filename]/route.ts"
git commit -m "feat: add annotation read/write API route"
```

---

### Task 9: API Route — プロジェクト設定取得

**Files:**
- Create: `src/app/api/config/route.ts`

**Step 1: 設定 Route Handler を作成**

`src/app/api/config/route.ts`:

```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return NextResponse.json(config);
}
```

**Step 2: コミット**

```bash
git add src/app/api/config/route.ts
git commit -m "feat: add project config API route"
```

---

### Task 10: アノテーション Canvas コンポーネント — バウンディングボックス描画

**Files:**
- Create: `src/components/annotation-canvas.tsx`

**Step 1: Canvas コンポーネントを作成**

`src/components/annotation-canvas.tsx`:

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Line, Circle, Image as KonvaImage, Transformer } from "react-konva";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import { Annotation, BBoxAnnotation, PolygonAnnotation, PointAnnotation, ToolType } from "@/lib/types";

interface AnnotationCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  activeTool: ToolType;
  activeLabel: string;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
}

export function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationsChange,
  activeTool,
  activeLabel,
  selectedAnnotationId,
  onSelectAnnotation,
}: AnnotationCanvasProps) {
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
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
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

  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !image) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - position.x) / scale / image.width,
      y: (pointer.y - position.y) / scale / image.height,
    };
  }, [position, scale, image]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
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
  }, [scale, position]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!image) return;

    // Right click or middle click for panning
    if (e.evt.button === 1 || e.evt.button === 2) return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === "select") {
      // Clicking on empty area deselects
      if (e.target === e.target.getStage() || e.target.getClassName() === "Image") {
        onSelectAnnotation(null);
      }
      return;
    }

    if (activeTool === "bbox") {
      setIsDrawing(true);
      setDrawingBBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === "point") {
      const newPoint: PointAnnotation = {
        id: uuidv4(),
        type: "point",
        label: activeLabel,
        x: pos.x,
        y: pos.y,
      };
      onAnnotationsChange([...annotations, newPoint]);
      return;
    }

    if (activeTool === "polygon") {
      // Double click closes polygon
      if (e.evt.detail === 2 && polygonPoints.length >= 6) {
        const newPolygon: PolygonAnnotation = {
          id: uuidv4(),
          type: "polygon",
          label: activeLabel,
          points: polygonPoints,
        };
        onAnnotationsChange([...annotations, newPolygon]);
        setPolygonPoints([]);
        return;
      }
      setPolygonPoints([...polygonPoints, pos.x, pos.y]);
      return;
    }
  }, [image, activeTool, activeLabel, annotations, polygonPoints, getRelativePointerPosition, onAnnotationsChange, onSelectAnnotation]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || activeTool !== "bbox" || !drawingBBox || !image) return;
    const pos = getRelativePointerPosition();
    if (!pos) return;

    setDrawingBBox({
      ...drawingBBox,
      width: pos.x - drawingBBox.x,
      height: pos.y - drawingBBox.y,
    });
  }, [isDrawing, activeTool, drawingBBox, image, getRelativePointerPosition]);

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

    const newBBox: BBoxAnnotation = {
      id: uuidv4(),
      type: "bbox",
      label: activeLabel,
      x, y, width, height,
    };
    onAnnotationsChange([...annotations, newBBox]);
    setDrawingBBox(null);
  }, [isDrawing, activeTool, drawingBBox, activeLabel, annotations, onAnnotationsChange]);

  const handleShapeClick = useCallback((id: string, nodeRef: Konva.Node) => {
    if (activeTool === "select") {
      onSelectAnnotation(id);
      selectedShapeRef.current = nodeRef;
    }
  }, [activeTool, onSelectAnnotation]);

  const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
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
        x: node.x() / image.width,
        y: node.y() / image.height,
        width: Math.max(0.005, (node.width() * scaleX) / image.width),
        height: Math.max(0.005, (node.height() * scaleY) / image.height),
      };
    });
    onAnnotationsChange(updated);
  }, [annotations, image, onAnnotationsChange]);

  const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!image) return;
    const node = e.target;

    const updated = annotations.map((ann) => {
      if (ann.id !== id) return ann;
      if (ann.type === "bbox") {
        return { ...ann, x: node.x() / image.width, y: node.y() / image.height };
      }
      if (ann.type === "point") {
        return { ...ann, x: node.x() / image.width, y: node.y() / image.height };
      }
      return ann;
    });
    onAnnotationsChange(updated);
  }, [annotations, image, onAnnotationsChange]);

  // Color per label
  const labelColors: Record<string, string> = {};
  const palette = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
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
    <div
      ref={containerRef}
      className="flex-1 bg-neutral-900 overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
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
        style={{ cursor: activeTool === "select" ? "grab" : "crosshair" }}
      >
        <Layer>
          {image && <KonvaImage image={image} width={imgWidth} height={imgHeight} />}

          {/* Render BBox annotations */}
          {annotations
            .filter((a): a is BBoxAnnotation => a.type === "bbox")
            .map((ann) => (
              <Rect
                key={ann.id}
                x={ann.x * imgWidth}
                y={ann.y * imgHeight}
                width={ann.width * imgWidth}
                height={ann.height * imgHeight}
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
                points={ann.points.map((p, i) =>
                  i % 2 === 0 ? p * imgWidth : p * imgHeight
                )}
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
                x={ann.x * imgWidth}
                y={ann.y * imgHeight}
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
                  i % 2 === 0 ? p * imgWidth : p * imgHeight
                )}
                stroke={labelColors[activeLabel] || "#FF0000"}
                strokeWidth={2 / scale}
                dash={[4 / scale, 4 / scale]}
              />
              {Array.from({ length: polygonPoints.length / 2 }).map((_, i) => (
                <Circle
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
```

**Step 2: コミット**

```bash
git add src/components/annotation-canvas.tsx
git commit -m "feat: add annotation canvas with bbox, polygon, point drawing"
```

---

### Task 11: 画像サイドバーコンポーネント

**Files:**
- Create: `src/components/image-sidebar.tsx`

**Step 1: 画像一覧サイドバーを作成**

`src/components/image-sidebar.tsx`:

```tsx
"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ImageSidebarProps {
  images: string[];
  currentImage: string | null;
  onSelectImage: (filename: string) => void;
}

export function ImageSidebar({ images, currentImage, onSelectImage }: ImageSidebarProps) {
  const currentIndex = currentImage ? images.indexOf(currentImage) : -1;

  return (
    <div className="w-48 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold">Images</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {currentIndex >= 0 ? `${currentIndex + 1} / ${images.length}` : `${images.length} files`}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {images.map((file, i) => (
            <button
              key={file}
              onClick={() => onSelectImage(file)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-xs truncate transition-colors",
                file === currentImage
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {file}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/image-sidebar.tsx
git commit -m "feat: add image sidebar component"
```

---

### Task 12: ツール・ラベルパネルコンポーネント

**Files:**
- Create: `src/components/tool-panel.tsx`

**Step 1: ツール・ラベルパネルを作成**

`src/components/tool-panel.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Annotation, ToolType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  labels: string[];
  activeLabel: string;
  onLabelChange: (label: string) => void;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
}

const TOOL_ICONS: Record<ToolType, string> = {
  select: "S",
  bbox: "B",
  polygon: "P",
  point: ".",
};

const TOOL_LABELS: Record<ToolType, string> = {
  select: "Select",
  bbox: "BBox",
  polygon: "Polygon",
  point: "Point",
};

const TOOL_SHORTCUTS: Record<ToolType, string> = {
  select: "V",
  bbox: "B",
  polygon: "P",
  point: ".",
};

export function ToolPanel({
  activeTool,
  onToolChange,
  labels,
  activeLabel,
  onLabelChange,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: ToolPanelProps) {
  return (
    <div className="w-56 border-l bg-muted/30 flex flex-col">
      {/* Tools */}
      <div className="p-3 border-b">
        <Label className="text-xs text-muted-foreground">Tools</Label>
        <div className="grid grid-cols-2 gap-1 mt-2">
          {(["select", "bbox", "polygon", "point"] as ToolType[]).map((tool) => (
            <Button
              key={tool}
              variant={activeTool === tool ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => onToolChange(tool)}
            >
              {TOOL_LABELS[tool]}
              <span className="ml-1 text-muted-foreground text-[10px]">
                ({TOOL_SHORTCUTS[tool]})
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="p-3 border-b">
        <Label className="text-xs text-muted-foreground">Labels</Label>
        <div className="flex flex-wrap gap-1 mt-2">
          {labels.map((label) => (
            <Badge
              key={label}
              variant={activeLabel === label ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onLabelChange(label)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Annotations list */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 pb-1">
          <Label className="text-xs text-muted-foreground">
            Annotations ({annotations.length})
          </Label>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                  ann.id === selectedAnnotationId
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectAnnotation(ann.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono">
                    {ann.type === "bbox" ? "B" : ann.type === "polygon" ? "P" : "."}
                  </span>
                  <span className="truncate">{ann.label}</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
```

**Step 2: コミット**

```bash
git add src/components/tool-panel.tsx
git commit -m "feat: add tool and label panel component"
```

---

### Task 13: メインアノテーションページ

**Files:**
- Create: `src/components/annotation-app.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: メインアプリコンポーネントを作成**

`src/components/annotation-app.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { AnnotationCanvas } from "./annotation-canvas";
import { ImageSidebar } from "./image-sidebar";
import { ToolPanel } from "./tool-panel";
import { Annotation, ToolType, ProjectConfig } from "@/lib/types";

export function AnnotationApp() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("bbox");
  const [activeLabel, setActiveLabel] = useState<string>("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Load config and images
  useEffect(() => {
    async function init() {
      const [configRes, imagesRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/images"),
      ]);
      const configData: ProjectConfig = await configRes.json();
      const imagesData = await imagesRes.json();

      setConfig(configData);
      setImages(imagesData.images);
      if (configData.labels.length > 0) {
        setActiveLabel(configData.labels[0]);
      }
      if (imagesData.images.length > 0) {
        setCurrentImage(imagesData.images[0]);
      }
    }
    init();
  }, []);

  // Load annotations when image changes
  useEffect(() => {
    if (!currentImage) return;
    async function loadAnnotations() {
      const res = await fetch(`/api/annotations/${encodeURIComponent(currentImage!)}`);
      const data = await res.json();
      setAnnotations(data.annotations || []);
      setSelectedAnnotationId(null);
    }
    loadAnnotations();
  }, [currentImage]);

  // Auto-save annotations
  const saveAnnotations = useCallback(
    async (anns: Annotation[]) => {
      if (!currentImage) return;
      // Get image dimensions from the loaded image
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
          annotations: anns,
        }),
      });
    },
    [currentImage]
  );

  const handleAnnotationsChange = useCallback(
    (newAnnotations: Annotation[]) => {
      setAnnotations(newAnnotations);
      saveAnnotations(newAnnotations);
    },
    [saveAnnotations]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      const updated = annotations.filter((a) => a.id !== id);
      setAnnotations(updated);
      saveAnnotations(updated);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
    },
    [annotations, saveAnnotations, selectedAnnotationId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "b":
          setActiveTool("bbox");
          break;
        case "p":
          setActiveTool("polygon");
          break;
        case ".":
          setActiveTool("point");
          break;
        case "delete":
        case "backspace":
          if (selectedAnnotationId) {
            handleDeleteAnnotation(selectedAnnotationId);
          }
          break;
        case "arrowleft":
          if (currentImage && images.length > 0) {
            const idx = images.indexOf(currentImage);
            if (idx > 0) setCurrentImage(images[idx - 1]);
          }
          break;
        case "arrowright":
          if (currentImage && images.length > 0) {
            const idx = images.indexOf(currentImage);
            if (idx < images.length - 1) setCurrentImage(images[idx + 1]);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, selectedAnnotationId, currentImage, images, handleDeleteAnnotation]);

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-background">
        <h1 className="text-sm font-semibold">Image Annotation Tool</h1>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {currentImage && (
            <span>
              {currentImage} ({images.indexOf(currentImage) + 1}/{images.length})
            </span>
          )}
          <span>
            Shortcuts: V=Select B=BBox P=Polygon .=Point Del=Delete ←→=Navigate
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        <ImageSidebar
          images={images}
          currentImage={currentImage}
          onSelectImage={setCurrentImage}
        />

        {currentImage ? (
          <AnnotationCanvas
            imageUrl={`/api/images/${encodeURIComponent(currentImage)}`}
            annotations={annotations}
            onAnnotationsChange={handleAnnotationsChange}
            activeTool={activeTool}
            activeLabel={activeLabel}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-neutral-900">
            <p className="text-muted-foreground">Select an image to start annotating</p>
          </div>
        )}

        <ToolPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          labels={config.labels}
          activeLabel={activeLabel}
          onLabelChange={setActiveLabel}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      </div>
    </div>
  );
}
```

**Step 2: page.tsx を書き換え**

`src/app/page.tsx`:

```tsx
import { AnnotationApp } from "@/components/annotation-app";

export default function Home() {
  return <AnnotationApp />;
}
```

**Step 3: layout.tsx のメタデータを更新**

`src/app/layout.tsx` の metadata を変更:

```typescript
export const metadata: Metadata = {
  title: "Image Annotation Tool",
  description: "ML training data annotation tool",
};
```

また、`body` タグに `overflow-hidden` を追加して全画面レイアウトにする:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}>
```

**Step 4: コミット**

```bash
git add src/components/annotation-app.tsx src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add main annotation page with full layout"
```

---

### Task 14: COCO JSON エクスポート

**Files:**
- Create: `src/app/api/export/coco/route.ts`

**Step 1: COCO エクスポート Route Handler を作成**

`src/app/api/export/coco/route.ts`:

```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ImageAnnotation, BBoxAnnotation, PolygonAnnotation, PointAnnotation } from "@/lib/types";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export async function GET() {
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  const labels: string[] = config.labels;

  // Build categories
  const categories = labels.map((label: string, i: number) => ({
    id: i + 1,
    name: label,
    supercategory: "none",
  }));

  const labelToId: Record<string, number> = {};
  labels.forEach((label: string, i: number) => {
    labelToId[label] = i + 1;
  });

  const images: Array<{ id: number; file_name: string; width: number; height: number }> = [];
  const cocoAnnotations: Array<Record<string, unknown>> = [];
  let annotationId = 1;

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ images: [], annotations: [], categories });
  }

  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));

  files.forEach((file, imageId) => {
    const data: ImageAnnotation = JSON.parse(
      fs.readFileSync(path.join(outputDir, file), "utf-8")
    );

    images.push({
      id: imageId + 1,
      file_name: data.imageFile,
      width: data.width,
      height: data.height,
    });

    data.annotations.forEach((ann) => {
      const categoryId = labelToId[ann.label] || 1;

      if (ann.type === "bbox") {
        const bbox = ann as BBoxAnnotation;
        const x = bbox.x * data.width;
        const y = bbox.y * data.height;
        const w = bbox.width * data.width;
        const h = bbox.height * data.height;

        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          bbox: [x, y, w, h],
          area: w * h,
          iscrowd: 0,
        });
      }

      if (ann.type === "polygon") {
        const poly = ann as PolygonAnnotation;
        const segmentation = [];
        const flatPoints: number[] = [];
        for (let i = 0; i < poly.points.length; i += 2) {
          flatPoints.push(poly.points[i] * data.width);
          flatPoints.push(poly.points[i + 1] * data.height);
        }
        segmentation.push(flatPoints);

        // Calculate bbox from polygon
        const xs = flatPoints.filter((_, i) => i % 2 === 0);
        const ys = flatPoints.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          segmentation,
          bbox: [minX, minY, maxX - minX, maxY - minY],
          area: (maxX - minX) * (maxY - minY),
          iscrowd: 0,
        });
      }

      if (ann.type === "point") {
        const pt = ann as PointAnnotation;
        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          keypoints: [pt.x * data.width, pt.y * data.height, 2],
          num_keypoints: 1,
        });
      }
    });
  });

  const coco = {
    images,
    annotations: cocoAnnotations,
    categories,
  };

  return new NextResponse(JSON.stringify(coco, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="coco_annotations.json"',
    },
  });
}
```

**Step 2: コミット**

```bash
git add src/app/api/export/coco/route.ts
git commit -m "feat: add COCO JSON export API"
```

---

### Task 15: YOLO TXT エクスポート

**Files:**
- Create: `src/app/api/export/yolo/route.ts`

**Step 1: YOLO エクスポート Route Handler を作成**

`src/app/api/export/yolo/route.ts`:

```typescript
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ImageAnnotation, BBoxAnnotation, PolygonAnnotation } from "@/lib/types";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export async function GET() {
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  const labels: string[] = config.labels;

  const labelToId: Record<string, number> = {};
  labels.forEach((label: string, i: number) => {
    labelToId[label] = i;
  });

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: "No annotations found" }, { status: 404 });
  }

  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));
  const results: Record<string, string> = {};

  // classes.txt
  results["classes.txt"] = labels.join("\n");

  files.forEach((file) => {
    const data: ImageAnnotation = JSON.parse(
      fs.readFileSync(path.join(outputDir, file), "utf-8")
    );
    const baseName = path.basename(file, ".json");
    const lines: string[] = [];

    data.annotations.forEach((ann) => {
      const classId = labelToId[ann.label] ?? 0;

      if (ann.type === "bbox") {
        const bbox = ann as BBoxAnnotation;
        // YOLO format: class_id center_x center_y width height (normalized)
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        lines.push(`${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${bbox.width.toFixed(6)} ${bbox.height.toFixed(6)}`);
      }

      if (ann.type === "polygon") {
        const poly = ann as PolygonAnnotation;
        // YOLO segmentation format: class_id x1 y1 x2 y2 ... (normalized)
        const pointsStr = poly.points.map((p) => p.toFixed(6)).join(" ");
        lines.push(`${classId} ${pointsStr}`);
      }
    });

    results[`${baseName}.txt`] = lines.join("\n");
  });

  return NextResponse.json(results, {
    headers: {
      "Content-Disposition": 'attachment; filename="yolo_annotations.json"',
    },
  });
}
```

**Step 2: コミット**

```bash
git add src/app/api/export/yolo/route.ts
git commit -m "feat: add YOLO TXT export API"
```

---

### Task 16: エクスポートボタンをヘッダーに追加

**Files:**
- Modify: `src/components/annotation-app.tsx`

**Step 1: ヘッダーにエクスポートボタンを追加**

`src/components/annotation-app.tsx` の header 部分にエクスポートボタンを追加:

import に `Button` を追加:
```tsx
import { Button } from "@/components/ui/button";
```

ヘッダーの shortcuts span の前にボタンを追加:

```tsx
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    className="text-xs"
    onClick={() => {
      window.open("/api/export/coco", "_blank");
    }}
  >
    Export COCO
  </Button>
  <Button
    variant="outline"
    size="sm"
    className="text-xs"
    onClick={() => {
      window.open("/api/export/yolo", "_blank");
    }}
  >
    Export YOLO
  </Button>
</div>
```

**Step 2: コミット**

```bash
git add src/components/annotation-app.tsx
git commit -m "feat: add export buttons to header"
```

---

### Task 17: 動作確認

**Step 1: テスト画像を用意**

`data/images/` に画像ファイルを1枚以上配置する。

**Step 2: アプリを起動**

```bash
npm run dev
```

**Step 3: ブラウザで動作確認**

`http://localhost:3000` にアクセスし、以下を確認:

1. 左サイドバーに画像一覧が表示される
2. 画像を選択すると Canvas に表示される
3. BBox ツールでドラッグして矩形が描ける
4. Polygon ツールでクリックして多角形が描ける (ダブルクリックで確定)
5. Point ツールでクリックして点が打てる
6. Select ツールでアノテーションの選択・移動・リサイズができる
7. 右パネルでラベル切り替え、アノテーション一覧表示・削除ができる
8. ←→キーで画像を切り替えられる
9. マウスホイールでズームできる
10. Export COCO / Export YOLO ボタンでエクスポートできる
11. アノテーションが JSON ファイルに自動保存される

**Step 4: 問題があれば修正してコミット**
