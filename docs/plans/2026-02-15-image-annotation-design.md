# Image Annotation Tool Design

## Overview

Next.js (App Router) + react-konva + shadcn/ui で構築する画像アノテーションツール。
ML訓練データ作成用。バウンディングボックス・ポリゴン・ポイントの3種類をサポート。
データはファイルベース (JSON) で保存。COCO JSON / YOLO TXT でエクスポート可能。

## Approach

react-konva (Konva.js の React バインディング) で Canvas 描画。
Server Actions / Route Handlers でファイルシステム上の画像読み込みとアノテーション保存。

## Data Model

```typescript
interface Project {
  imageDir: string;
  outputDir: string;
  labels: string[];
}

interface ImageAnnotation {
  imageFile: string;
  width: number;
  height: number;
  annotations: Annotation[];
}

type Annotation = BBoxAnnotation | PolygonAnnotation | PointAnnotation;

interface BBoxAnnotation {
  id: string;
  type: "bbox";
  label: string;
  x: number; y: number;
  width: number; height: number;
}

interface PolygonAnnotation {
  id: string;
  type: "polygon";
  label: string;
  points: [number, number][];
}

interface PointAnnotation {
  id: string;
  type: "point";
  label: string;
  x: number; y: number;
}
```

All coordinates are normalized (0-1) relative to image dimensions.

## Screen Layout

```
┌─────────────────────────────────────────────────┐
│ Header: Project name / Image 3/20               │
├──────┬──────────────────────────┬───────────────┤
│      │                          │ Tools:        │
│Image │                          │  □ BBox       │
│List  │     Canvas               │  △ Polygon    │
│      │     (annotation area)    │  ● Point      │
│      │                          │               │
│      │                          │ Labels:       │
│      │                          │  car          │
│      │                          │  person       │
│      │                          │───────────────│
│      │                          │ Annotations:  │
│      │                          │  bbox: car    │
│      │                          │  point: person│
├──────┴──────────────────────────┴───────────────┤
│ Status: Zoom / Coordinates / Shortcuts          │
└─────────────────────────────────────────────────┘
```

## Features

1. Image loading from specified local directory
2. Bounding box drawing (drag to create, resize/move)
3. Polygon drawing (click vertices, double-click to close)
4. Point drawing (click to place)
5. Label assignment per annotation
6. Edit/delete annotations (select, move, resize, delete)
7. Zoom/pan (mouse wheel zoom, drag pan)
8. Navigate images (keyboard arrows)
9. Auto-save annotations (JSON)
10. Export to COCO JSON / YOLO TXT

## Tech Stack

- Next.js (App Router)
- react-konva (Canvas rendering)
- shadcn/ui + Tailwind CSS (UI)
- File-based storage (JSON)
