# テスト戦略

## 1. フレームワーク選定

| ツール | 用途 | 選定理由 |
|---|---|---|
| **Vitest** | Unit / Integration | Vite ベースで高速、ESM ネイティブ、Jest 互換 API、Next.js 公式サポート |
| **Storybook** | コンポーネントテスト / CDD | コンポーネント分離開発、interaction testing、ビジュアルカタログ |
| **Playwright** | E2E | クロスブラウザ、安定した非同期待機、Konva Canvas 操作可能 |

### Storybook の位置付け

Storybook をコンポーネント駆動開発 (CDD) の主軸とする。全コンポーネントを Presentational/Container に分離し、Presentational コンポーネントは Storybook 上で開発・検証する。interaction testing でコンポーネント操作のリグレッションも検知する。

詳細な設計は [Storybook CDD 設計書](plans/2026-02-15-storybook-cdd-design.md) を参照。

## 2. テストレイヤー

```
        ╱ E2E (Playwright) ╲              ← 少数の重要フロー
       ╱ Interaction (Storybook) ╲        ← コンポーネント操作テスト
      ╱ Integration (Vitest) ╲            ← Store + API ルート
     ╱ Unit (Vitest)            ╲         ← 純粋関数 ← 最も厚く
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

### P2 — API ルート

- `src/app/api/sam/embedding/route.ts`
- `src/app/api/annotations/[filename]/route.ts`

### P3 — E2E

- SAM ワークフロー: ツール選択 → クリック → マスク表示 → Enter で確定
- 既存ツール回帰: BBox / Polygon / Point 描画

## 4. ディレクトリ構造

```
src/
  components/
    ui/
      button.stories.tsx          # shadcn/ui Stories
      badge.stories.tsx
    views/
      tool-panel-view.stories.tsx  # View Stories (interaction testing)
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
      sam/embedding/
        __tests__/
          route.test.ts
tests/
  e2e/
    sam-workflow.spec.ts
    annotation-tools.spec.ts
```

## 5. 検証コマンド

```bash
pnpm test             # Vitest (unit + integration)
pnpm test:watch       # Vitest ウォッチモード
pnpm test:coverage    # カバレッジレポート
pnpm test:storybook   # Storybook interaction testing (要: Storybook 起動中)
pnpm test:e2e         # Playwright E2E
pnpm test:all         # 全テスト一括実行
pnpm storybook        # Storybook 開発サーバー
pnpm build-storybook  # Storybook 静的ビルド
```
