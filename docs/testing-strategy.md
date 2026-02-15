# テスト戦略

## 1. フレームワーク選定

| ツール | 用途 | 選定理由 |
|---|---|---|
| **Vitest** | Unit / Integration | Vite ベースで高速、ESM ネイティブ、Jest 互換 API、Next.js 公式サポート |
| **Storybook** | コンポーネントテスト / CDD | コンポーネント分離開発、interaction testing、ビジュアルカタログ |
| **Playwright** | E2E | クロスブラウザ、安定した非同期待機、Konva Canvas 操作可能 |
| **MSW 2.0+** | API モック | リクエストインターセプト、Vitest/Storybook/E2E 全レイヤーで共有可能 |

### Storybook の位置付け

Storybook をコンポーネント駆動開発 (CDD) の主軸とする。全コンポーネントを Presentational/Container に分離し、Presentational コンポーネントは Storybook 上で開発・検証する。interaction testing でコンポーネント操作のリグレッションも検知する。

詳細な設計は [Storybook CDD 設計書](plans/2026-02-15-storybook-cdd-design.md) を参照。

### MSW によるAPI モック統一

[MSW (Mock Service Worker)](https://mswjs.io/) 2.0+ をリクエストインターセプトの共通基盤とする。

- **Unit/Integration (Vitest)**: `setupServer()` でノードプロセス内インターセプト
- **Storybook**: `msw-storybook-addon` で Story 単位のモック定義
- **E2E (Playwright)**: 必要に応じて `page.route()` と併用

```typescript
// src/mocks/handlers.ts — 全レイヤー共有
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/images", () =>
    HttpResponse.json({ images: ["img1.jpg", "img2.jpg"] }),
  ),
  http.get("/api/config", () =>
    HttpResponse.json({ imageDir: "data/images", outputDir: "data/annotations", labels: ["person", "car"] }),
  ),
  http.get("/api/annotations/:filename", () =>
    HttpResponse.json({ imageFile: "img1.jpg", width: 800, height: 600, annotations: [] }),
  ),
];
```

## 2. テストレイヤー

```
        ╱ E2E (Playwright) ╲              ← 少数の重要フロー
       ╱ Interaction (Storybook) ╲        ← コンポーネント操作テスト
      ╱ Integration (Vitest + MSW) ╲      ← Store + API ルート
     ╱ Unit (Vitest)                 ╲    ← 純粋関数 ← 最も厚く
```

Unit を最も厚くし、上位レイヤーほど少数の重要ケースに絞る。Storybook interaction testing が Vitest と Playwright の間を埋める。

## 3. 優先順位付きテスト対象

### P0 — 純粋関数 (最優先、外部依存なし)

- `src/lib/sam/mask-to-polygon.ts` — `contourArea`, `approxPolyDP`, `maskToPolygon`
- `src/lib/branded.ts` — `toPixel`, `toNormalized`, ラウンドトリップ
- `src/lib/annotation-factory.ts` — 各ファクトリ関数、immutability

### P1 — Store ロジック (Zustand)

- `src/lib/stores/sam-store.ts` — `addClick` / `removeLastClick` / `clearClicks` / `reset`
- `src/lib/stores/annotation-store.ts` — `previousImage` / `nextImage` / `deleteAnnotation`

### P1.5 — コンポーネント (Storybook interaction testing)

- `ToolPanelView` — ツール選択、ラベル切替、アノテーション削除操作
- `ImageSidebarView` — 画像選択操作
- `AnnotationCanvasView` — 描画操作 (Konva decorator 使用)
- `SamOverlayView` — クリックポイント表示状態

### P2 — API ルート + コントラクトテスト

- `src/app/api/sam/embedding/route.ts`
- `src/app/api/annotations/[filename]/route.ts`
- `src/app/api/config/route.ts`
- `src/app/api/images/route.ts`
- `src/app/api/export/coco/route.ts`
- `src/app/api/export/yolo/route.ts`

#### Zod スキーマによるコントラクトテスト

本プロジェクトは全 API の入出力を `src/lib/schemas.ts` で Zod スキーマとして定義済み。これを活用し、フロントエンド↔API 間の型契約をテストで保証する。

```typescript
// src/app/api/annotations/[filename]/__tests__/route.test.ts
import { imageAnnotationSchema } from "@/lib/schemas";

test("GET /api/annotations/:filename — レスポンスがスキーマに準拠", async () => {
  const res = await GET(request, { params: { filename: "test.jpg" } });
  const json = await res.json();
  const result = imageAnnotationSchema.safeParse(json);
  expect(result.success).toBe(true);
});

test("PUT /api/annotations/:filename — 不正データは 400", async () => {
  const res = await PUT(invalidRequest, { params: { filename: "test.jpg" } });
  expect(res.status).toBe(400);
});
```

**Pact-JS が不要な理由**: フロントエンドとバックエンドが同一 Next.js アプリ内にあり、Zod スキーマを `schemas.ts` で共有している。別サービス間の契約テストが必要になった場合にのみ Pact-JS を検討する。

### P3 — E2E

- SAM ワークフロー: ツール選択 → クリック → マスク表示 → Enter で確定
- 既存ツール回帰: BBox / Polygon / Point 描画

## 4. ディレクトリ構造

```
src/
  mocks/
    handlers.ts               # MSW ハンドラ (全レイヤー共有)
    server.ts                 # Vitest 用 setupServer
  components/
    ui/
      button.stories.tsx
      badge.stories.tsx
    views/
      tool-panel-view.stories.tsx
      image-sidebar-view.stories.tsx
      annotation-canvas-view.stories.tsx
      sam-overlay-view.stories.tsx
  lib/
    sam/
      __tests__/
        mask-to-polygon.test.ts
    stores/
      __tests__/
        sam-store.test.ts
        annotation-store.test.ts
    __tests__/
      branded.test.ts
      annotation-factory.test.ts
  app/
    api/
      annotations/[filename]/
        __tests__/
          route.test.ts       # Zod スキーマ準拠テスト含む
      sam/embedding/
        __tests__/
          route.test.ts
      config/
        __tests__/
          route.test.ts
tests/
  e2e/
    sam-workflow.spec.ts
    annotation-tools.spec.ts
```

## 5. API ルートテスト戦略

Next.js App Router の API ルートは、ルートハンドラ関数を直接インポートしてテストする。

```typescript
// src/app/api/images/__tests__/route.test.ts
import { GET } from "../route";

test("GET /api/images — 画像一覧を返す", async () => {
  const res = await GET();
  expect(res.status).toBe(200);

  const json = await res.json();
  expect(json).toHaveProperty("images");
  expect(Array.isArray(json.images)).toBe(true);
});
```

ファイルシステム依存のルート (`repository.ts`) は `vi.mock()` でモックする。SAM embedding ルートは ONNX ランタイムのモックが必要。

## 6. 検証コマンド

```bash
pnpm test             # Vitest (unit + integration)
pnpm test:watch       # Vitest ウォッチモード
pnpm test:coverage    # カバレッジレポート
pnpm test:e2e         # Playwright E2E
pnpm storybook        # Storybook 開発サーバー
pnpm build-storybook  # Storybook 静的ビルド
```

## 7. CI パイプライン (推奨)

```yaml
# .github/workflows/test.yml (参考)
jobs:
  test:
    steps:
      - run: pnpm lint
      - run: pnpm test:coverage
      - run: pnpm build
      - run: pnpm build-storybook
      - run: pnpm test:e2e
```

lint → unit/integration → build → storybook build → E2E の順で実行し、早期失敗で無駄な実行を防ぐ。
