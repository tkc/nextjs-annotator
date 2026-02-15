# Image Annotation Tool - Architecture

## Overview

Next.js 16 (App Router) + react-konva + shadcn/ui で構築した ML訓練データ作成用画像アノテーションツール。
ローカルディレクトリの画像に対して BBox / Polygon / Point のアノテーションを行い、COCO JSON / YOLO TXT でエクスポートする。

## Tech Stack

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.1.6 | フレームワーク (App Router) |
| React | 19.2.3 | UI ライブラリ |
| Konva + react-konva | 10.2 / 19.2 | Canvas 描画 |
| Tailwind CSS | 4.x | スタイリング |
| shadcn/ui (Radix UI) | latest | UI コンポーネント |
| uuid | 13.x | アノテーション ID 生成 |

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── annotations/[filename]/route.ts   # アノテーション読み書き
│   │   ├── config/route.ts                   # プロジェクト設定取得
│   │   ├── export/
│   │   │   ├── coco/route.ts                 # COCO JSON エクスポート
│   │   │   └── yolo/route.ts                 # YOLO TXT エクスポート
│   │   └── images/
│   │       ├── route.ts                      # 画像一覧取得
│   │       └── [filename]/route.ts           # 画像ファイル配信
│   ├── layout.tsx                            # ルートレイアウト
│   ├── page.tsx                              # エントリーポイント
│   └── globals.css
├── components/
│   ├── annotation-app.tsx                    # メインアプリ (状態管理)
│   ├── annotation-canvas.tsx                 # Konva Canvas (描画)
│   ├── image-sidebar.tsx                     # 画像一覧パネル
│   ├── tool-panel.tsx                        # ツール・ラベルパネル
│   └── ui/                                   # shadcn/ui コンポーネント
└── lib/
    ├── types.ts                              # 型定義
    └── utils.ts                              # ユーティリティ (cn)

data/
├── images/          # アノテーション対象の画像
└── annotations/     # 保存されたアノテーション JSON

annotation-config.json   # プロジェクト設定
```

## Component Architecture

```
page.tsx (Server Component)
└── AnnotationApp (Client Component - 状態管理の中心)
    ├── ImageSidebar        左: 画像一覧
    ├── AnnotationCanvas    中央: Canvas 描画領域
    └── ToolPanel           右: ツール・ラベル・アノテーション一覧
```

全 UI コンポーネントは Client Component (`"use client"`)。
AnnotationApp が全状態を管理し、子コンポーネントに props で渡す。

### 状態管理

AnnotationApp が持つ状態:

| State | 型 | 説明 |
|-------|---|------|
| `config` | `ProjectConfig \| null` | プロジェクト設定 (ラベル、パス) |
| `images` | `string[]` | 画像ファイル名一覧 |
| `currentImage` | `string \| null` | 現在表示中の画像 |
| `annotations` | `Annotation[]` | 現在の画像のアノテーション |
| `activeTool` | `ToolType` | アクティブなツール |
| `activeLabel` | `string` | アクティブなラベル |
| `selectedAnnotationId` | `string \| null` | 選択中のアノテーション ID |

## Data Flow

```
               ┌──────────────────────────┐
               │    annotation-config.json  │
               └────────────┬─────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
   GET /api/config   GET /api/images   GET /api/annotations/{file}
          │                 │                  │
          ▼                 ▼                  ▼
   ┌──────────────────────────────────────────────┐
   │           AnnotationApp (State)               │
   │  config, images, currentImage, annotations    │
   └──────┬──────────────┬──────────────┬─────────┘
          │              │              │
     props│         props│         props│
          ▼              ▼              ▼
   ImageSidebar   AnnotationCanvas   ToolPanel
                       │
                  onAnnotationsChange
                       │
                       ▼
              PUT /api/annotations/{file}   ← 自動保存
                       │
                       ▼
              data/annotations/{name}.json
```

## Data Model

全座標は画像サイズに対する正規化値 (0-1) で保存。

```typescript
type Annotation = BBoxAnnotation | PolygonAnnotation | PointAnnotation;

interface BBoxAnnotation {
  id: string;           // UUID
  type: "bbox";
  label: string;        // ラベル名
  x: number;            // 左上 X (0-1)
  y: number;            // 左上 Y (0-1)
  width: number;        // 幅 (0-1)
  height: number;       // 高さ (0-1)
}

interface PolygonAnnotation {
  id: string;
  type: "polygon";
  label: string;
  points: number[];     // [x1, y1, x2, y2, ...] (0-1)
}

interface PointAnnotation {
  id: string;
  type: "point";
  label: string;
  x: number;            // (0-1)
  y: number;            // (0-1)
}
```

保存形式 (`data/annotations/{name}.json`):

```json
{
  "imageFile": "photo.jpg",
  "width": 1920,
  "height": 1080,
  "annotations": [
    { "id": "uuid", "type": "bbox", "label": "car", "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4 }
  ]
}
```

## API Routes

| Route | Method | 説明 |
|-------|--------|------|
| `/api/config` | GET | `annotation-config.json` を返す |
| `/api/images` | GET | 画像ディレクトリ内のファイル一覧 |
| `/api/images/[filename]` | GET | 画像バイナリを MIME タイプ付きで配信 |
| `/api/annotations/[filename]` | GET | アノテーション JSON を返す (存在しなければ空) |
| `/api/annotations/[filename]` | PUT | アノテーション JSON を保存 |
| `/api/export/coco` | GET | 全アノテーションを COCO JSON でダウンロード |
| `/api/export/yolo` | GET | 全アノテーションを YOLO 形式でダウンロード |

## Canvas (react-konva)

AnnotationCanvas は react-konva の Stage/Layer 上に以下を描画:

1. **KonvaImage** — 対象画像
2. **Rect** — BBox アノテーション (ドラッグで作成、Transformer でリサイズ)
3. **Line** — Polygon アノテーション (クリックで頂点追加、ダブルクリックで確定)
4. **Circle** — Point アノテーション (クリックで配置)
5. **Transformer** — 選択中の BBox のリサイズハンドル

### 描画操作

| ツール | 操作 | 動作 |
|--------|------|------|
| Select (V) | クリック | アノテーション選択 |
| Select (V) | ドラッグ (空領域) | キャンバスパン |
| Select (V) | ドラッグ (図形) | 図形移動 |
| BBox (B) | ドラッグ | 矩形描画 |
| Polygon (P) | クリック | 頂点追加 |
| Polygon (P) | ダブルクリック | ポリゴン確定 |
| Point (.) | クリック | ポイント配置 |
| (共通) | マウスホイール | ズーム (0.1x - 10x) |

### ラベル色

8色のパレットからラベルごとに自動割り当て:
`#FF6B6B`, `#4ECDC4`, `#45B7D1`, `#96CEB4`, `#FFEAA7`, `#DDA0DD`, `#98D8C8`, `#F7DC6F`

## Keyboard Shortcuts

| キー | アクション |
|------|-----------|
| V | Select ツール |
| B | BBox ツール |
| P | Polygon ツール |
| . | Point ツール |
| Delete / Backspace | 選択中のアノテーション削除 |
| ← | 前の画像 |
| → | 次の画像 |

## Export Formats

### COCO JSON (`/api/export/coco`)

```json
{
  "images": [{ "id": 1, "file_name": "photo.jpg", "width": 1920, "height": 1080 }],
  "annotations": [
    { "id": 1, "image_id": 1, "category_id": 1, "bbox": [x, y, w, h], "area": ..., "iscrowd": 0 }
  ],
  "categories": [{ "id": 1, "name": "car", "supercategory": "none" }]
}
```

- BBox: `bbox` (ピクセル座標)
- Polygon: `segmentation` (ピクセル座標の頂点配列)
- Point: `keypoints` (visibility=2)

### YOLO TXT (`/api/export/yolo`)

画像ごとの `.txt` ファイル:

```
# BBox: class_id center_x center_y width height (正規化)
0 0.250000 0.400000 0.300000 0.400000

# Polygon: class_id x1 y1 x2 y2 ... (正規化)
1 0.100000 0.200000 0.300000 0.200000 0.300000 0.400000
```

`classes.txt` にラベル名一覧 (0-indexed)。

## Configuration

`annotation-config.json`:

```json
{
  "imageDir": "./data/images",
  "outputDir": "./data/annotations",
  "labels": ["car", "person", "dog", "cat", "bicycle"]
}
```

- `imageDir` — アノテーション対象画像のディレクトリ
- `outputDir` — アノテーション JSON の出力先
- `labels` — 使用するラベル一覧

## Design Decisions

1. **正規化座標 (0-1)** — 画像解像度に依存しない。ズーム/パン時も計算がシンプル
2. **ファイルベース保存** — DB 不要。Git 管理可能。ポータブル
3. **自動保存** — アノテーション変更ごとに即座に PUT。明示的な保存操作が不要
4. **Server Actions 不使用** — Route Handlers を採用。Canvas の非同期操作と相性が良い
5. **react-konva** — Canvas API をReact宣言的に扱える。Transformer によるリサイズが組み込み
