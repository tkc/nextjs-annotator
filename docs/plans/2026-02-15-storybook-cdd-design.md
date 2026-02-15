# Storybook CDD UI 再設計

## 目的

全コンポーネントをコンポーネント駆動開発 (CDD) に移行する。Storybook 上でコンポーネントを分離して開発・確認し、組み上げていくワークフローを確立する。

## アプローチ: Presentational/Container 分離

すべてのメインコンポーネントを2層に分離する:

- **Presentational (View)** — props のみで制御。Store への依存なし。Storybook の Story 対象
- **Container** — Store 接続、イベントハンドリング、副作用。View に props を渡す

## コンポーネント分離マップ

| 現在 | Presentational | Container |
|------|---------------|-----------|
| `AnnotationApp` | `AppLayout` — Header + 3カラムレイアウトを slots で受け取る | `AnnotationApp` — 初期化、キーボードショートカット |
| `ToolPanel` | `ToolPanelView` — ツール・ラベル・アノテーション一覧を props で描画 | `ToolPanel` — Store から状態取得、アクション変換 |
| `ImageSidebar` | `ImageSidebarView` — 画像リスト・選択状態を props で描画 | `ImageSidebar` — Store から images/currentImage 取得 |
| `AnnotationCanvas` | `AnnotationCanvasView` — Stage/Layer/各シェイプを props で描画 | `AnnotationCanvas` — Store 接続、座標変換、描画状態管理 |
| `SamOverlay` | `SamOverlayView` — マスク・クリックポイント・ステータスを props で描画 | `SamOverlay` — samStore から状態取得 |

## ディレクトリ構造

```
src/components/
  ui/                                  # shadcn/ui プリミティブ (変更なし)
    button.tsx
    button.stories.tsx
    badge.tsx
    badge.stories.tsx
    ...

  views/                               # Presentational (props のみ)
    app-layout.tsx
    app-layout.stories.tsx
    tool-panel-view.tsx
    tool-panel-view.stories.tsx
    image-sidebar-view.tsx
    image-sidebar-view.stories.tsx
    annotation-canvas-view.tsx
    annotation-canvas-view.stories.tsx
    sam-overlay-view.tsx
    sam-overlay-view.stories.tsx

  containers/                          # Store 接続
    annotation-app.tsx
    tool-panel.tsx
    image-sidebar.tsx
    annotation-canvas.tsx
    sam-overlay.tsx
```

Story ファイルは View コンポーネントとコロケーション配置する。

## Props インターフェース

### ToolPanelView

```typescript
type ToolPanelViewProps = {
  tools: ToolType[]
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  labels: LabelConfig[]
  activeLabel: string
  onLabelChange: (label: string) => void
  annotations: readonly Annotation[]
  selectedAnnotationId: string | null
  onSelectAnnotation: (id: string) => void
  onDeleteAnnotation: (id: string) => void
}
```

### ImageSidebarView

```typescript
type ImageSidebarViewProps = {
  images: readonly string[]
  currentImage: string | null
  onSelectImage: (filename: string) => void
}
```

### AnnotationCanvasView

```typescript
type AnnotationCanvasViewProps = {
  imageSrc: string | null
  imageWidth: number
  imageHeight: number
  annotations: readonly Annotation[]
  activeTool: ToolType
  activeLabel: string
  selectedAnnotationId: string | null
  onAnnotationsChange: (annotations: readonly Annotation[]) => void
  onSelectAnnotation: (id: string | null) => void
  samOverlay?: ReactNode
}
```

### SamOverlayView

```typescript
type SamOverlayViewProps = {
  maskImageSrc: string | null
  clicks: SamClick[]
  score: number | null
  isProcessing: boolean
  error: string | null
  imageWidth: number
  imageHeight: number
}
```

### AppLayout

```typescript
type AppLayoutProps = {
  header: ReactNode
  sidebar: ReactNode
  canvas: ReactNode
  toolPanel: ReactNode
}
```

## Storybook 設定

### フレームワーク・アドオン

| パッケージ | 用途 |
|-----------|------|
| `@storybook/nextjs` | Next.js フレームワーク統合 |
| `@storybook/addon-essentials` | Controls, Actions, Viewport, Docs |
| `@storybook/addon-interactions` | interaction testing (play functions) |
| `@storybook/test` | Vitest 統合 |

### Konva Canvas 用 Decorator

```tsx
import { Stage, Layer } from "react-konva";

export const withKonvaStage = (width = 800, height = 600) =>
  (Story) => (
    <Stage width={width} height={height}>
      <Layer>
        <Story />
      </Layer>
    </Stage>
  );
```

Konva コンポーネント (`AnnotationCanvasView`, `SamOverlayView`) の Story ではこの decorator で `Stage`/`Layer` をラップする。

### Story 方針

- 各 View コンポーネントに最低限: **Default**, **Empty**, **Loading** (該当する場合) の Story
- `argTypes` で controls を定義し、インタラクティブに状態を切り替え可能にする
- shadcn/ui プリミティブにも Story を作成 (Button variants, Badge colors 等)

## テスト戦略の更新

Storybook interaction testing がテストピラミッドに追加される:

```
        ╱ E2E (Playwright) ╲              ← 少数の重要フロー
       ╱ Interaction (Storybook) ╲        ← コンポーネント操作テスト
      ╱ Integration (Vitest) ╲            ← Store + API ルート
     ╱ Unit (Vitest)            ╲         ← 純粋関数 ← 最も厚く
```

## 検証コマンド

```bash
pnpm storybook        # Storybook 開発サーバー
pnpm test             # Vitest (unit + integration)
pnpm test:e2e         # Playwright
pnpm test:coverage    # カバレッジレポート
```
