# SAM (Segment Anything Model) ブラウザ統合 設計書

## 概要

ONNX Runtime Web を使用して SAM のマスクデコーダをブラウザ上で実行し、ユーザーのクリック操作からリアルタイムでオブジェクトセグメンテーション（ポリゴン自動生成）を行う機能を追加する。

### ユーザー体験

1. SAM ツールを選択（ショートカット: `S`）
2. 画像上でクリック（前景ポイント）/ 右クリック（背景ポイント）
3. マスクがリアルタイムでオーバーレイ表示される（< 50ms）
4. 「確定」でマスクがポリゴンアノテーションとして保存される

---

## アーキテクチャ

### Server / Client 分割

```
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Next.js API Route)                                  │
│                                                              │
│  POST /api/sam/embedding                                     │
│  ├─ Python subprocess で SAM Image Encoder を実行             │
│  │  ├─ Input:  画像ファイルパス                                │
│  │  └─ Output: image_embedding [1, 256, 64, 64] float32      │
│  ├─ Embedding をキャッシュ (data/embeddings/{hash}.bin)        │
│  └─ Response: ArrayBuffer (1,048,576 × 4 = ~4 MB)            │
│                                                              │
│  処理時間: ViT-B ~3s (GPU), ~30s (CPU)                        │
│  1画像あたり1回のみ実行                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ image_embedding (ArrayBuffer)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (Client)                                            │
│                                                              │
│  1. ONNX Runtime Web で Mask Decoder をロード (~5 MB, 初回)    │
│  2. ユーザーがクリック → point prompt を生成                    │
│  3. Mask Decoder 推論 (< 50ms)                               │
│     ├─ Input:  embedding + point_coords + point_labels        │
│     └─ Output: mask logits [1, 1, H, W]                      │
│  4. Mask → Canvas オーバーレイ表示                              │
│  5. 確定 → Mask → Polygon 変換 → Zustand store に追加          │
│                                                              │
│  クリックごとにデコーダのみ再実行 (インタラクティブ)              │
└─────────────────────────────────────────────────────────────┘
```

### 設計判断: エンコーダをサーバーで実行する理由

| 方式 | エンコーダサイズ | 推論時間 | 利点 | 欠点 |
|------|-------------|---------|------|------|
| **サーバー (ViT-B)** | 375 MB | ~3s (GPU) | 高品質、高速 | Python/GPU 依存 |
| ブラウザ (MobileSAM) | ~108 MB | 30-60s (WASM) | オフライン可 | 初回が遅すぎる |
| ブラウザ (WebGPU) | ~134 MB | ~5s | GPU 活用 | Chrome のみ、Safari/Firefox 非対応 |

**選定: サーバー (ViT-B)** — 本ツールはローカル開発環境で使用する前提。Python + PyTorch の存在を要求してもコストが低い。ブラウザ側はデコーダのみ（~5 MB）でクロスブラウザ対応。

---

## モデル仕様

### 使用モデル: SAM ViT-B (Meta)

| コンポーネント | パラメータ | ONNX サイズ | 実行場所 |
|-------------|----------|------------|---------|
| Image Encoder (ViT-B) | 91M | 375 MB | サーバー (Python) |
| Mask Decoder (quantized) | 3.8M | ~5 MB | ブラウザ (ONNX Runtime Web) |

### Mask Decoder — 入力テンソル

| テンソル名 | Shape | 型 | 説明 |
|-----------|-------|-----|------|
| `image_embeddings` | `[1, 256, 64, 64]` | float32 | エンコーダの出力 (サーバーから取得) |
| `point_coords` | `[1, N+1, 2]` | float32 | クリック座標 (1024 long-side にスケール) + パディング点 |
| `point_labels` | `[1, N+1]` | float32 | `1`=前景, `0`=背景, `-1`=パディング |
| `mask_input` | `[1, 1, 256, 256]` | float32 | 前回のマスク (初回はゼロ) |
| `has_mask_input` | `[1]` | float32 | `0`=初回, `1`=refinement |
| `orig_im_size` | `[2]` | float32 | `[height, width]` 元画像サイズ |

### Mask Decoder — 出力テンソル

| テンソル名 | Shape | 型 | 説明 |
|-----------|-------|-----|------|
| `masks` | `[1, 1, H, W]` | float32 | マスク logits (`> 0.0` で前景) |
| `iou_predictions` | `[1, 1]` | float32 | 品質スコア (0-1) |
| `low_res_masks` | `[1, 1, 256, 256]` | float32 | 低解像度マスク (refinement 用) |

### 座標スケーリング

SAM は入力画像の long side を 1024px にリサイズして処理する。クリック座標も同じスケールに変換する必要がある:

```typescript
const LONG_SIDE = 1024;
const samScale = LONG_SIDE / Math.max(imageWidth, imageHeight);

// クリック座標をピクセル座標 → SAM スケールに変換
const scaledX = pixelX * samScale;
const scaledY = pixelY * samScale;
```

---

## 変更対象ファイル一覧

| アクション | ファイル | 説明 |
|---|---|---|
| 依存追加 | `package.json` | `onnxruntime-web` |
| 設定変更 | `next.config.ts` | COOP/COEP ヘッダー (SharedArrayBuffer) |
| **新規作成** | `src/lib/sam/sam-decoder.ts` | ONNX デコーダラッパー |
| **新規作成** | `src/lib/sam/mask-to-polygon.ts` | マスク → ポリゴン変換 (輪郭抽出) |
| **新規作成** | `src/lib/stores/sam-store.ts` | SAM 専用 Zustand store |
| **新規作成** | `src/components/sam-overlay.tsx` | マスクオーバーレイ (Konva レイヤー) |
| **新規作成** | `src/app/api/sam/embedding/route.ts` | Embedding 生成 API |
| **新規作成** | `scripts/sam_encoder.py` | Python エンコーダスクリプト |
| 変更 | `src/lib/schemas.ts` | `ToolType` に `"sam"` 追加 |
| 変更 | `src/lib/stores/annotation-store.ts` | `ToolType` 拡張対応 |
| 変更 | `src/components/annotation-canvas.tsx` | SAM ツールの Canvas 操作 |
| 変更 | `src/components/tool-panel.tsx` | SAM ツールボタン追加 |
| 変更 | `src/components/annotation-app.tsx` | `S` キーボードショートカット |
| 配置 | `public/models/sam_decoder_quantized.onnx` | デコーダモデルファイル |

---

## 詳細設計

### 1. `ToolType` 拡張

```typescript
// src/lib/schemas.ts
export type AnnotationType = "bbox" | "polygon" | "point";
export type ToolType = AnnotationType | "select" | "sam";  // "sam" を追加
```

ToolPanel の `TOOL_LABELS` / `TOOL_SHORTCUTS` にも追加:

```typescript
const TOOL_LABELS = {
  // ...既存...
  sam: "SAM",
} as const;

const TOOL_SHORTCUTS = {
  // ...既存...
  sam: "S",
} as const;
```

### 2. SAM Decoder ラッパー (`src/lib/sam/sam-decoder.ts`)

```typescript
import { InferenceSession, Tensor } from "onnxruntime-web";

const LONG_SIDE = 1024;
const MODEL_URL = "/models/sam_decoder_quantized.onnx";

export interface SamClick {
  x: number;        // ピクセル座標
  y: number;        // ピクセル座標
  clickType: 1 | 0; // 1=前景, 0=背景
}

export interface SamResult {
  mask: Float32Array;    // logits [H × W]
  width: number;
  height: number;
  iouScore: number;
}

let session: InferenceSession | null = null;

export async function loadDecoder(): Promise<void> {
  if (session) return;
  const ort = await import("onnxruntime-web");
  ort.env.wasm.numThreads = 4;
  ort.env.wasm.proxy = true;
  session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ["wasm"],
  });
}

export async function runDecoder(
  embedding: Float32Array,
  clicks: SamClick[],
  imageWidth: number,
  imageHeight: number,
  previousMask?: Float32Array,
): Promise<SamResult> {
  if (!session) throw new Error("SAM decoder not loaded");

  const n = clicks.length;
  const samScale = LONG_SIDE / Math.max(imageWidth, imageHeight);

  // point_coords: [1, N+1, 2] — 最後にパディング点を追加
  const pointCoords = new Float32Array(2 * (n + 1));
  const pointLabels = new Float32Array(n + 1);
  for (let i = 0; i < n; i++) {
    pointCoords[2 * i] = clicks[i].x * samScale;
    pointCoords[2 * i + 1] = clicks[i].y * samScale;
    pointLabels[i] = clicks[i].clickType;
  }
  pointCoords[2 * n] = 0;
  pointCoords[2 * n + 1] = 0;
  pointLabels[n] = -1;

  const hasMask = previousMask ? 1 : 0;
  const maskInput = previousMask ?? new Float32Array(256 * 256);

  const feeds = {
    image_embeddings: new Tensor("float32", embedding, [1, 256, 64, 64]),
    point_coords: new Tensor("float32", pointCoords, [1, n + 1, 2]),
    point_labels: new Tensor("float32", pointLabels, [1, n + 1]),
    mask_input: new Tensor("float32", maskInput, [1, 1, 256, 256]),
    has_mask_input: new Tensor("float32", [hasMask]),
    orig_im_size: new Tensor("float32", [imageHeight, imageWidth]),
  };

  const results = await session.run(feeds);

  return {
    mask: results.masks.data as Float32Array,
    width: imageWidth,
    height: imageHeight,
    iouScore: (results.iou_predictions.data as Float32Array)[0],
  };
}
```

### 3. マスク → ポリゴン変換 (`src/lib/sam/mask-to-polygon.ts`)

外部依存なしで Suzuki-Abe 輪郭検出 + Douglas-Peucker 簡略化を実装する。OpenCV.js (~8 MB) は不使用。

```typescript
/**
 * SAM のマスク logits をポリゴン頂点 (正規化座標) に変換する。
 *
 * 処理フロー:
 *   mask logits → 二値化 (threshold=0.0)
 *                → 輪郭検出 (Suzuki-Abe)
 *                → 最大輪郭を選択
 *                → 頂点簡略化 (Douglas-Peucker, epsilon=2.0)
 *                → 正規化座標 [x1, y1, x2, y2, ...] に変換
 */

export interface PolygonResult {
  points: number[];    // 正規化座標 [x1, y1, x2, y2, ...]
  vertexCount: number;
}

export function maskToPolygon(
  mask: Float32Array,
  width: number,
  height: number,
): PolygonResult | null {
  // 1. 二値化
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    binary[i] = mask[i] > 0.0 ? 1 : 0;
  }

  // 2. 輪郭検出 (Suzuki-Abe アルゴリズム)
  const contours = findContours(binary, width, height);
  if (contours.length === 0) return null;

  // 3. 最大面積の輪郭を選択
  const largest = contours.reduce((a, b) =>
    contourArea(a) > contourArea(b) ? a : b
  );

  // 4. Douglas-Peucker 簡略化
  const simplified = approxPolyDP(largest, 2.0);
  if (simplified.length < 3) return null;

  // 5. 正規化座標に変換
  const points: number[] = [];
  for (const [x, y] of simplified) {
    points.push(x / width, y / height);
  }

  return { points, vertexCount: simplified.length };
}
```

- `findContours`: ~100 行の Suzuki-Abe 実装（[参考実装](https://gist.github.com/LingDong-/b99cdbe814e600d8152c0eefeef01ab3)）
- `approxPolyDP`: ~40 行の Douglas-Peucker 実装
- 外部依存ゼロ、バンドルサイズ影響なし

### 4. SAM 専用 Zustand Store (`src/lib/stores/sam-store.ts`)

annotation-store とは別に SAM 固有の一時的な状態を管理する。

```typescript
import { create } from "zustand";
import type { SamClick, SamResult } from "@/lib/sam/sam-decoder";

interface SamState {
  // 状態
  isDecoderLoaded: boolean;
  isEmbeddingLoaded: boolean;
  isProcessing: boolean;
  clicks: SamClick[];
  currentMask: SamResult | null;
  lowResMask: Float32Array | null;  // refinement 用
  error: string | null;

  // アクション
  setDecoderLoaded: () => void;
  setEmbedding: (embedding: Float32Array) => void;
  addClick: (click: SamClick) => void;
  removeLastClick: () => void;
  clearClicks: () => void;
  setMask: (mask: SamResult, lowRes: Float32Array) => void;
  setProcessing: (v: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;  // 画像切り替え時
}
```

**annotation-store との分離理由:**

- SAM の状態 (clicks, mask, embedding) はアノテーション確定前の一時データ
- 確定時にのみ `annotationStore.updateAnnotations()` を呼ぶ
- 画像切り替え時に SAM 状態だけリセットできる
- annotation-store の再レンダリングに影響しない

### 5. Embedding API (`src/app/api/sam/embedding/route.ts`)

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadConfig, readImageFile } from "@/lib/repository";

const CACHE_DIR = path.join(process.cwd(), "data", "embeddings");

export async function POST(request: NextRequest) {
  const { filename } = await request.json();
  const config = loadConfig();

  // 画像ファイルの存在確認
  const imageBuffer = readImageFile(filename, config);
  if (!imageBuffer) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // キャッシュ確認 (画像ハッシュベース)
  const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex").slice(0, 16);
  const cachePath = path.join(CACHE_DIR, `${hash}.bin`);

  if (fs.existsSync(cachePath)) {
    const cached = fs.readFileSync(cachePath);
    return new NextResponse(cached, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  }

  // Python subprocess で encoder を実行
  const imagePath = path.resolve(process.cwd(), config.imageDir, filename);
  const embedding = await runEncoder(imagePath);

  // キャッシュに保存
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, Buffer.from(embedding.buffer));

  return new NextResponse(Buffer.from(embedding.buffer), {
    headers: { "Content-Type": "application/octet-stream" },
  });
}

function runEncoder(imagePath: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [
      path.join(process.cwd(), "scripts", "sam_encoder.py"),
      imagePath,
    ]);

    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk) => chunks.push(chunk));
    proc.stderr.on("data", (data) => console.error(`SAM encoder: ${data}`));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Encoder exited with code ${code}`));
      const buf = Buffer.concat(chunks);
      resolve(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
    });
  });
}
```

### 6. Python Encoder スクリプト (`scripts/sam_encoder.py`)

```python
"""SAM Image Encoder — embedding を stdout にバイナリ出力する"""
import sys
import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor
from PIL import Image

MODEL_TYPE = "vit_b"
CHECKPOINT = "models/sam_vit_b_01ec64.pth"

def main():
    image_path = sys.argv[1]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam = sam_model_registry[MODEL_TYPE](checkpoint=CHECKPOINT).to(device)
    predictor = SamPredictor(sam)

    image = np.array(Image.open(image_path).convert("RGB"))
    predictor.set_image(image)

    embedding = predictor.get_image_embedding().cpu().numpy()
    # Shape: [1, 256, 64, 64], dtype: float32
    sys.stdout.buffer.write(embedding.tobytes())

if __name__ == "__main__":
    main()
```

### 7. Canvas 統合 (`annotation-canvas.tsx` の変更)

SAM ツール選択時の Canvas 操作:

```
activeTool === "sam" の場合:

左クリック  → samStore.addClick({ x, y, clickType: 1 })  → デコーダ実行
右クリック  → samStore.addClick({ x, y, clickType: 0 })  → デコーダ実行
Ctrl+Z      → samStore.removeLastClick()                   → デコーダ再実行
Enter       → マスク確定 → ポリゴン変換 → annotationStore.updateAnnotations()
Escape      → samStore.clearClicks()                       → マスククリア
```

### 8. マスクオーバーレイ (`src/components/sam-overlay.tsx`)

マスク logits を Konva `Image` としてレンダリングする:

```typescript
/**
 * SAM マスクを半透明オーバーレイとして Canvas 上に表示する。
 *
 * mask logits (Float32Array) を RGBA ImageData に変換し、
 * offscreen canvas → HTMLImageElement → Konva Image で描画。
 *
 * 色: rgba(0, 114, 189, 0.4) — 前景領域を青で塗る
 */
```

- Konva の `<Image>` コンポーネントとして既存の Layer 内に配置
- マスク更新ごとに offscreen canvas で ImageData を生成
- クリックポイントも `<Circle>` で描画 (緑=前景, 赤=背景)

### 9. `next.config.ts` — COOP/COEP ヘッダー

ONNX Runtime Web の multi-threading に SharedArrayBuffer が必要:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};
```

`credentialless` を使用 (`require-corp` ではなく) — 外部リソース (CDN フォント等) との互換性を維持。

---

## データフロー: SAM アノテーション作成の全体像

```
[ユーザーが SAM ツールを選択]
         │
         ▼
[画像に対して初回クリック]
         │
         ├── Embedding がキャッシュにない場合:
         │   POST /api/sam/embedding { filename }
         │   └── Python encoder 実行 (~3s GPU / ~30s CPU)
         │   └── レスポンス: ArrayBuffer (~4 MB)
         │   └── samStore.setEmbedding(embedding)
         │
         ├── Embedding がキャッシュにある場合:
         │   └── 即座に samStore から取得
         │
         ▼
[samStore.addClick({ x, y, clickType: 1 })]
         │
         ▼
[runDecoder(embedding, clicks, width, height)]  ← < 50ms
         │
         ▼
[samStore.setMask(result)]
         │
         ▼
[SamOverlay がマスクを Canvas にオーバーレイ表示]
         │
         ├── 追加クリック → デコーダ再実行 → マスク更新
         ├── 右クリック (背景) → 除外領域を指定
         ├── Ctrl+Z → 最後のクリックを取り消し
         │
         ▼
[Enter で確定]
         │
         ▼
[maskToPolygon(mask, width, height)]
         │
         ├── 二値化 → 輪郭検出 → Douglas-Peucker 簡略化
         │
         ▼
[createPolygon(activeLabel, normalizedPoints)]
         │
         ▼
[annotationStore.updateAnnotations([...annotations, polygon])]
         │
         ▼
[PUT /api/annotations/{filename}]  ← 自動保存
```

---

## UI 変更

### ToolPanel

```
┌─────────────────┐
│ Tools            │
│ ┌──────┬──────┐ │
│ │Select│ BBox │ │
│ │ (V)  │ (B)  │ │
│ ├──────┼──────┤ │
│ │Polyg │ Point│ │
│ │ (P)  │ (.)  │ │
│ ├──────┴──────┤ │
│ │   SAM (S)   │ │  ← 全幅ボタン、アクセント色で差別化
│ └─────────────┘ │
```

### SAM 操作中の Canvas

```
┌──────────────────────────────────────────┐
│                                          │
│    ┌───────────────────────┐             │
│    │  [半透明青マスク]       │             │
│    │       ●(緑)            │  ← 前景クリック
│    │            ○(赤)       │  ← 背景クリック
│    └───────────────────────┘             │
│                                          │
│  ─────────────────────────────────────── │
│  SAM: 2 clicks | IoU: 0.94 | Enter=確定  │  ← ステータスバー
└──────────────────────────────────────────┘
```

### キーボードショートカット追加

| キー | アクション |
|------|-----------|
| S | SAM ツール |
| Enter (SAM 時) | マスク確定 → ポリゴン作成 |
| Escape (SAM 時) | クリックリセット |
| Ctrl+Z (SAM 時) | 最後のクリック取り消し |

---

## 依存関係

### npm パッケージ

| パッケージ | バージョン | サイズ | 用途 |
|-----------|----------|-------|------|
| `onnxruntime-web` | ^1.24 | ~15 MB (WASM 含む) | ブラウザ ONNX 推論 |

### Python (サーバーサイド、オプショナル)

| パッケージ | 用途 |
|-----------|------|
| `segment-anything` | SAM モデルロード |
| `torch` | PyTorch |
| `Pillow` | 画像読み込み |
| `numpy` | テンソル操作 |

### モデルファイル

| ファイル | サイズ | 配置先 | 取得元 |
|---------|-------|-------|--------|
| `sam_decoder_quantized.onnx` | ~5 MB | `public/models/` | [segment-anything](https://github.com/facebookresearch/segment-anything) から export |
| `sam_vit_b_01ec64.pth` | 375 MB | `models/` (gitignore) | [Meta](https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth) |

---

## エラーハンドリング

| シナリオ | 対処 |
|---------|------|
| Python 未インストール | SAM ツールを無効化。ToolPanel に「Python required」表示 |
| checkpoint 未配置 | API が 500 を返す → samStore.error にメッセージ設定 |
| Embedding 生成中 | ローディングスピナー表示。クリック無効化 |
| デコーダ推論失敗 | エラートースト表示。クリックリストは維持 |
| マスク面積が小さすぎる | 確定時に警告。最小面積閾値 (画像面積の 0.1%) |
| 輪郭検出で頂点 < 3 | 確定ボタン無効化 |

---

## パフォーマンス指標

| 処理 | 目標 | 実装方針 |
|------|------|---------|
| デコーダモデルロード | < 2s (初回) | WASM + Web Worker proxy |
| Embedding 取得 (キャッシュヒット) | < 100ms | ファイルキャッシュ (~4 MB) |
| Embedding 生成 (キャッシュミス) | < 5s (GPU) | Python subprocess + キャッシュ |
| マスクデコーダ推論 | < 50ms | Quantized ONNX + 4 threads |
| マスク描画 | < 16ms (60fps) | Offscreen canvas → Konva Image |
| ポリゴン変換 | < 10ms | Suzuki-Abe + Douglas-Peucker |

---

## 実装順序

### Phase 1: 基盤 (SAM ツール無しで動作確認可能)

1. `onnxruntime-web` インストール + `next.config.ts` ヘッダー設定
2. `scripts/sam_encoder.py` + `POST /api/sam/embedding` API route
3. Embedding キャッシュ (`data/embeddings/`)

### Phase 2: ブラウザ推論

4. `public/models/sam_decoder_quantized.onnx` 配置
5. `src/lib/sam/sam-decoder.ts` — デコーダラッパー
6. `src/lib/sam/mask-to-polygon.ts` — 輪郭検出 + 簡略化
7. `src/lib/stores/sam-store.ts` — 状態管理

### Phase 3: UI 統合

8. `ToolType` に `"sam"` 追加 (schemas.ts)
9. `src/components/sam-overlay.tsx` — マスクオーバーレイ
10. `annotation-canvas.tsx` — SAM ツールの Canvas 操作
11. `tool-panel.tsx` — SAM ツールボタン
12. `annotation-app.tsx` — `S` ショートカット + Enter/Escape ハンドリング

### Phase 4: 検証

13. 型チェック (`tsc --noEmit`) + ビルド (`npm run build`) + lint
14. 手動テスト: クリック → マスク表示 → ポリゴン確定 → 保存 → リロードで永続化確認

---

## 将来の拡張

| 機能 | 説明 | 優先度 |
|------|------|--------|
| BBox プロンプト | SAM ツールでドラッグ → BBox prompt でセグメンテーション | 中 |
| MobileSAM フォールバック | Python 未インストール時にブラウザのみで動作 | 低 |
| マスク refinement | 2回目のクリックから `low_res_masks` を入力に使用 | 高 |
| バッチ embedding | 全画像の embedding を一括事前計算 | 低 |
| SAM2 対応 | 動画セグメンテーション (将来的に動画アノテーション機能と併用) | 低 |
