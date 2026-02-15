# Storybook CDD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全コンポーネントを Presentational/Container に分離し、Storybook CDD ワークフローを確立する。

**Architecture:** 各コンポーネントを View (props のみ) + Container (Store 接続) に分離。View コンポーネントに Story を書き、Storybook 上で各状態を確認可能にする。Konva コンポーネントは mock Stage decorator でラップ。

**Tech Stack:** Storybook 8 + @storybook/nextjs, react-konva, Zustand, shadcn/ui

---

### Task 1: Storybook セットアップ

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.ts`
- Modify: `package.json` (scripts + devDependencies)

**Step 1: Storybook と関連パッケージをインストール**

Run:
```bash
pnpm add -D storybook @storybook/nextjs @storybook/react @storybook/addon-essentials @storybook/addon-interactions @storybook/test @storybook/blocks
```

**Step 2: `.storybook/main.ts` を作成**

```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
```

**Step 3: `.storybook/preview.ts` を作成**

```typescript
import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

**Step 4: `package.json` に scripts 追加**

`scripts` に以下を追加:
```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

**Step 5: Storybook 起動確認**

Run: `pnpm storybook`
Expected: ブラウザで http://localhost:6006 が開き、"No stories found" 的な画面が表示される。

**Step 6: Commit**

```bash
git add .storybook/ package.json pnpm-lock.yaml
git commit -m "chore: add Storybook with Next.js framework"
```

---

### Task 2: shadcn/ui プリミティブの Stories

**Files:**
- Create: `src/components/ui/button.stories.tsx`
- Create: `src/components/ui/badge.stories.tsx`

**Step 1: Button Story を作成**

`src/components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta = {
  title: "ui/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Button" },
};

export const Destructive: Story = {
  args: { children: "Delete", variant: "destructive" },
};

export const Outline: Story = {
  args: { children: "Outline", variant: "outline" },
};

export const Small: Story = {
  args: { children: "Small", size: "sm" },
};
```

**Step 2: Badge Story を作成**

`src/components/ui/badge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";

const meta = {
  title: "ui/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Label" },
};

export const Outline: Story = {
  args: { children: "person", variant: "outline" },
};

export const Selected: Story = {
  args: { children: "car", variant: "default" },
};
```

**Step 3: Storybook で表示確認**

Run: `pnpm storybook`
Expected: サイドバーに `ui/Button` と `ui/Badge` が表示され、Controls で variant/size を切り替えられる。

**Step 4: Commit**

```bash
git add src/components/ui/button.stories.tsx src/components/ui/badge.stories.tsx
git commit -m "feat: add Stories for Button and Badge primitives"
```

---

### Task 3: AppLayout View コンポーネント

**Files:**
- Create: `src/components/views/app-layout.tsx`
- Create: `src/components/views/app-layout.stories.tsx`

**Step 1: AppLayout View を作成**

`src/components/views/app-layout.tsx`:

```tsx
import type { ReactNode } from "react";

export interface AppLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  canvas: ReactNode;
  toolPanel: ReactNode;
}

export function AppLayout({ header, sidebar, canvas, toolPanel }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {header}
      <div className="flex-1 flex min-h-0">
        {sidebar}
        {canvas}
        {toolPanel}
      </div>
    </div>
  );
}
```

**Step 2: Story を作成**

`src/components/views/app-layout.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AppLayout } from "./app-layout";

const meta = {
  title: "views/AppLayout",
  component: AppLayout,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    header: (
      <header className="h-12 border-b flex items-center px-4 bg-background">
        <h1 className="text-sm font-semibold">Image Annotation Tool</h1>
      </header>
    ),
    sidebar: (
      <div className="w-48 border-r bg-muted/30 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Sidebar</span>
      </div>
    ),
    canvas: (
      <div className="flex-1 bg-neutral-900 flex items-center justify-center">
        <span className="text-muted-foreground">Canvas Area</span>
      </div>
    ),
    toolPanel: (
      <div className="w-56 border-l bg-muted/30 flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Tool Panel</span>
      </div>
    ),
  },
};
```

**Step 3: Storybook で確認**

Run: `pnpm storybook`
Expected: `views/AppLayout` が表示され、3カラムレイアウトが見える。

**Step 4: Commit**

```bash
git add src/components/views/
git commit -m "feat: extract AppLayout presentational component with Story"
```

---

### Task 4: ImageSidebarView コンポーネント

**Files:**
- Create: `src/components/views/image-sidebar-view.tsx`
- Create: `src/components/views/image-sidebar-view.stories.tsx`

**Step 1: ImageSidebarView を作成**

`src/components/views/image-sidebar-view.tsx`:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ImageSidebarViewProps {
  images: readonly string[];
  currentImage: string | null;
  onSelectImage: (filename: string) => void;
}

export function ImageSidebarView({ images, currentImage, onSelectImage }: ImageSidebarViewProps) {
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
              type="button"
              key={file}
              onClick={() => onSelectImage(file)}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-xs truncate transition-colors",
                file === currentImage ? "bg-primary text-primary-foreground" : "hover:bg-muted",
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

**Step 2: Story を作成**

`src/components/views/image-sidebar-view.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ImageSidebarView } from "./image-sidebar-view";

const SAMPLE_IMAGES = [
  "image_001.jpg",
  "image_002.jpg",
  "image_003.jpg",
  "image_004.jpg",
  "image_005.jpg",
];

const meta = {
  title: "views/ImageSidebarView",
  component: ImageSidebarView,
  args: {
    onSelectImage: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: 500 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageSidebarView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    images: SAMPLE_IMAGES,
    currentImage: "image_002.jpg",
  },
};

export const NoSelection: Story = {
  args: {
    images: SAMPLE_IMAGES,
    currentImage: null,
  },
};

export const Empty: Story = {
  args: {
    images: [],
    currentImage: null,
  },
};
```

**Step 3: ImageSidebar Container を作成**

`src/components/containers/image-sidebar.tsx`:

```tsx
"use client";

import { useShallow } from "zustand/react/shallow";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { ImageSidebarView } from "@/components/views/image-sidebar-view";

export function ImageSidebar() {
  const { images, currentImage } = useAnnotationStore(
    useShallow((s) => ({ images: s.images, currentImage: s.currentImage })),
  );
  const setCurrentImage = useAnnotationStore((s) => s.setCurrentImage);

  return (
    <ImageSidebarView
      images={images}
      currentImage={currentImage}
      onSelectImage={setCurrentImage}
    />
  );
}
```

**Step 4: Storybook で確認**

Run: `pnpm storybook`
Expected: `views/ImageSidebarView` の3つの Story (Default, NoSelection, Empty) が表示される。

**Step 5: Commit**

```bash
git add src/components/views/image-sidebar-view.tsx src/components/views/image-sidebar-view.stories.tsx src/components/containers/image-sidebar.tsx
git commit -m "feat: extract ImageSidebarView with Container/Presentational split"
```

---

### Task 5: ToolPanelView コンポーネント

**Files:**
- Create: `src/components/views/tool-panel-view.tsx`
- Create: `src/components/views/tool-panel-view.stories.tsx`
- Create: `src/components/containers/tool-panel.tsx`

**Step 1: ToolPanelView を作成**

`src/components/views/tool-panel-view.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Annotation, ToolType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOOL_LABELS = Object.freeze({
  select: "Select",
  bbox: "BBox",
  polygon: "Polygon",
  point: "Point",
  sam: "SAM",
} as const satisfies Record<ToolType, string>);

const TOOL_SHORTCUTS = Object.freeze({
  select: "V",
  bbox: "B",
  polygon: "P",
  point: ".",
  sam: "S",
} as const satisfies Record<ToolType, string>);

export interface ToolPanelViewProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  labels: readonly string[];
  activeLabel: string;
  onLabelChange: (label: string) => void;
  annotations: readonly Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function ToolPanelView({
  activeTool,
  onToolChange,
  labels,
  activeLabel,
  onLabelChange,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: ToolPanelViewProps) {
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
              <span className="ml-1 text-muted-foreground text-[10px]">({TOOL_SHORTCUTS[tool]})</span>
            </Button>
          ))}
        </div>
        <Button
          variant={activeTool === "sam" ? "default" : "outline"}
          size="sm"
          className="text-xs w-full mt-1"
          onClick={() => onToolChange("sam")}
        >
          {TOOL_LABELS.sam}
          <span className="ml-1 text-muted-foreground text-[10px]">({TOOL_SHORTCUTS.sam})</span>
        </Button>
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
          <Label className="text-xs text-muted-foreground">Annotations ({annotations.length})</Label>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                role="option"
                aria-selected={ann.id === selectedAnnotationId}
                tabIndex={0}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors w-full text-left",
                  ann.id === selectedAnnotationId ? "bg-primary/10 border border-primary/30" : "hover:bg-muted",
                )}
                onClick={() => onSelectAnnotation(ann.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectAnnotation(ann.id);
                  }
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono">
                    {ann.type === "bbox" ? "B" : ann.type === "polygon" ? "P" : "."}
                  </span>
                  <span className="truncate">{ann.label}</span>
                </span>
                <button
                  type="button"
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

**Step 2: Story を作成**

`src/components/views/tool-panel-view.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { Annotation } from "@/lib/types";
import { ToolPanelView } from "./tool-panel-view";

const SAMPLE_ANNOTATIONS: Annotation[] = [
  { id: "1" as any, type: "bbox", label: "person", x: 0.1 as any, y: 0.2 as any, width: 0.3 as any, height: 0.4 as any },
  { id: "2" as any, type: "polygon", label: "car", points: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6] as any },
  { id: "3" as any, type: "point", label: "person", x: 0.5 as any, y: 0.5 as any },
];

const meta = {
  title: "views/ToolPanelView",
  component: ToolPanelView,
  args: {
    onToolChange: fn(),
    onLabelChange: fn(),
    onSelectAnnotation: fn(),
    onDeleteAnnotation: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: 600 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToolPanelView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeTool: "bbox",
    labels: ["person", "car", "dog", "cat"],
    activeLabel: "person",
    annotations: SAMPLE_ANNOTATIONS,
    selectedAnnotationId: null,
  },
};

export const SamToolActive: Story = {
  args: {
    activeTool: "sam",
    labels: ["person", "car"],
    activeLabel: "person",
    annotations: [],
    selectedAnnotationId: null,
  },
};

export const WithSelection: Story = {
  args: {
    activeTool: "select",
    labels: ["person", "car"],
    activeLabel: "person",
    annotations: SAMPLE_ANNOTATIONS,
    selectedAnnotationId: "1" as any,
  },
};

export const NoLabels: Story = {
  args: {
    activeTool: "bbox",
    labels: [],
    activeLabel: "",
    annotations: [],
    selectedAnnotationId: null,
  },
};
```

**Step 3: ToolPanel Container を作成**

`src/components/containers/tool-panel.tsx`:

```tsx
"use client";

import { useShallow } from "zustand/react/shallow";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { ToolPanelView } from "@/components/views/tool-panel-view";

export function ToolPanel() {
  const { activeTool, activeLabel, annotations, selectedAnnotationId, labels } = useAnnotationStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      activeLabel: s.activeLabel,
      annotations: s.annotations,
      selectedAnnotationId: s.selectedAnnotationId,
      labels: s.config?.labels ?? [],
    })),
  );
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool);
  const setActiveLabel = useAnnotationStore((s) => s.setActiveLabel);
  const setSelectedAnnotationId = useAnnotationStore((s) => s.setSelectedAnnotationId);
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation);

  return (
    <ToolPanelView
      activeTool={activeTool}
      onToolChange={setActiveTool}
      labels={labels}
      activeLabel={activeLabel}
      onLabelChange={setActiveLabel}
      annotations={annotations}
      selectedAnnotationId={selectedAnnotationId}
      onSelectAnnotation={setSelectedAnnotationId}
      onDeleteAnnotation={deleteAnnotation}
    />
  );
}
```

**Step 4: Storybook で確認**

Run: `pnpm storybook`
Expected: `views/ToolPanelView` の4つの Story が表示される。ツールボタン・ラベル・アノテーション一覧が正しく描画される。

**Step 5: Commit**

```bash
git add src/components/views/tool-panel-view.tsx src/components/views/tool-panel-view.stories.tsx src/components/containers/tool-panel.tsx
git commit -m "feat: extract ToolPanelView with Container/Presentational split"
```

---

### Task 6: SamOverlayView コンポーネント

**Files:**
- Create: `src/components/views/sam-overlay-view.tsx`
- Create: `src/components/views/sam-overlay-view.stories.tsx`
- Create: `src/components/containers/sam-overlay.tsx`
- Create: `.storybook/decorators/with-konva-stage.tsx`

**Step 1: Konva decorator を作成**

`.storybook/decorators/with-konva-stage.tsx`:

```tsx
import type { Decorator } from "@storybook/react";
import { Layer, Stage } from "react-konva";

export const withKonvaStage =
  (width = 800, height = 600): Decorator =>
  (Story) => (
    <Stage width={width} height={height}>
      <Layer>
        <Story />
      </Layer>
    </Stage>
  );
```

**Step 2: SamOverlayView を作成**

`src/components/views/sam-overlay-view.tsx`:

```tsx
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
```

**Step 3: Story を作成**

`src/components/views/sam-overlay-view.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { withKonvaStage } from "../../../.storybook/decorators/with-konva-stage";
import { SamOverlayView } from "./sam-overlay-view";

const meta = {
  title: "views/SamOverlayView",
  component: SamOverlayView,
  decorators: [withKonvaStage(800, 600)],
} satisfies Meta<typeof SamOverlayView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoClicks: Story = {
  args: {
    maskData: null,
    clicks: [],
    iouScore: 0,
    isProcessing: false,
    error: null,
    imageWidth: 800,
    imageHeight: 600,
    scale: 1,
  },
};

export const WithClicks: Story = {
  args: {
    maskData: null,
    clicks: [
      { x: 0.3, y: 0.4, clickType: 1 },
      { x: 0.6, y: 0.5, clickType: 1 },
      { x: 0.1, y: 0.1, clickType: 0 },
    ],
    iouScore: 0.92,
    isProcessing: false,
    error: null,
    imageWidth: 800,
    imageHeight: 600,
    scale: 1,
  },
};

export const Processing: Story = {
  args: {
    maskData: null,
    clicks: [{ x: 0.5, y: 0.5, clickType: 1 }],
    iouScore: 0,
    isProcessing: true,
    error: null,
    imageWidth: 800,
    imageHeight: 600,
    scale: 1,
  },
};

export const WithError: Story = {
  args: {
    maskData: null,
    clicks: [{ x: 0.5, y: 0.5, clickType: 1 }],
    iouScore: 0,
    isProcessing: false,
    error: "Decoder failed to process",
    imageWidth: 800,
    imageHeight: 600,
    scale: 1,
  },
};
```

**Step 4: SamOverlay Container を作成**

`src/components/containers/sam-overlay.tsx`:

```tsx
"use client";

import { useShallow } from "zustand/react/shallow";
import { useSamStore } from "@/lib/stores/sam-store";
import { SamOverlayView } from "@/components/views/sam-overlay-view";

interface SamOverlayProps {
  imageWidth: number;
  imageHeight: number;
  scale: number;
}

export function SamOverlay({ imageWidth, imageHeight, scale }: SamOverlayProps) {
  const { clicks, currentMask, isProcessing, error } = useSamStore(
    useShallow((s) => ({
      clicks: s.clicks,
      currentMask: s.currentMask,
      isProcessing: s.isProcessing,
      error: s.error,
    })),
  );

  return (
    <SamOverlayView
      maskData={currentMask ? { mask: currentMask.mask, width: currentMask.width, height: currentMask.height } : null}
      clicks={clicks}
      iouScore={currentMask?.iouScore ?? 0}
      isProcessing={isProcessing}
      error={error}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      scale={scale}
    />
  );
}
```

**Step 5: Storybook で確認**

Run: `pnpm storybook`
Expected: `views/SamOverlayView` の4つの Story が表示される。WithClicks では緑/赤のクリックポイントとステータステキストが見える。

**Step 6: Commit**

```bash
git add .storybook/decorators/ src/components/views/sam-overlay-view.tsx src/components/views/sam-overlay-view.stories.tsx src/components/containers/sam-overlay.tsx
git commit -m "feat: extract SamOverlayView with Konva decorator and Container split"
```

---

### Task 7: AnnotationCanvasView コンポーネント

最も複雑なコンポーネント。描画ロジック (isDrawing, drawingBBox, polygonPoints) は Canvas 内部状態として View に残す。Store との接続のみ Container に移す。

**Files:**
- Create: `src/components/views/annotation-canvas-view.tsx`
- Create: `src/components/views/annotation-canvas-view.stories.tsx`
- Create: `src/components/containers/annotation-canvas.tsx`

**Step 1: AnnotationCanvasView を作成**

`src/components/views/annotation-canvas-view.tsx`:

```tsx
"use client";

import type Konva from "konva";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Transformer } from "react-konva";
import { createBBox, createPoint, createPolygon } from "@/lib/annotation-factory";
import type {
  Annotation,
  BBoxAnnotation,
  NormalizedCoord,
  PointAnnotation,
  PolygonAnnotation,
  ToolType,
} from "@/lib/types";
import { normalizedCoord, toNormalized, toPixel } from "@/lib/types";

export interface AnnotationCanvasViewProps {
  imageUrl: string;
  annotations: readonly Annotation[];
  activeTool: ToolType;
  activeLabel: string;
  selectedAnnotationId: string | null;
  onAnnotationsChange: (annotations: readonly Annotation[]) => void;
  onSelectAnnotation: (id: string | null) => void;
  onImageLoad?: (width: number, height: number) => void;
  onSamClick?: (x: NormalizedCoord, y: NormalizedCoord, clickType: 0 | 1) => void;
  samOverlay?: ReactNode;
}

const PALETTE = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"] as const;

export function AnnotationCanvasView({
  imageUrl,
  annotations,
  activeTool,
  activeLabel,
  selectedAnnotationId,
  onAnnotationsChange,
  onSelectAnnotation,
  onImageLoad,
  onSamClick,
  samOverlay,
}: AnnotationCanvasViewProps) {
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
      onImageLoad?.(img.width, img.height);
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
  }, [imageUrl, onImageLoad]);

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
      if (e.evt.button === 1) return;
      if (e.evt.button === 2 && activeTool !== "sam") return;

      const pos = getRelativePointerPosition();
      if (!pos) return;

      if (activeTool === "select") {
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
        const newPoint = createPoint(activeLabel, pos.x, pos.y);
        onAnnotationsChange([...annotations, newPoint]);
        return;
      }

      if (activeTool === "polygon") {
        if (e.evt.detail === 2 && polygonPoints.length >= 6) {
          const newPolygon = createPolygon(activeLabel, polygonPoints);
          onAnnotationsChange([...annotations, newPolygon]);
          setPolygonPoints([]);
          return;
        }
        setPolygonPoints([...polygonPoints, pos.x, pos.y]);
        return;
      }

      if (activeTool === "sam") {
        const clickType = e.evt.button === 2 ? 0 : 1;
        onSamClick?.(pos.x, pos.y, clickType as 0 | 1);
        return;
      }
    },
    [image, activeTool, activeLabel, annotations, polygonPoints, getRelativePointerPosition, onAnnotationsChange, onSelectAnnotation, onSamClick],
  );

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || activeTool !== "bbox" || !drawingBBox || !image) return;
      const pos = getRelativePointerPosition();
      if (!pos) return;
      setDrawingBBox({ ...drawingBBox, width: pos.x - drawingBBox.x, height: pos.y - drawingBBox.y });
    },
    [isDrawing, activeTool, drawingBBox, image, getRelativePointerPosition],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || activeTool !== "bbox" || !drawingBBox) return;
    setIsDrawing(false);

    const x = drawingBBox.width < 0 ? drawingBBox.x + drawingBBox.width : drawingBBox.x;
    const y = drawingBBox.height < 0 ? drawingBBox.y + drawingBBox.height : drawingBBox.y;
    const width = Math.abs(drawingBBox.width);
    const height = Math.abs(drawingBBox.height);

    if (width < 0.005 || height < 0.005) {
      setDrawingBBox(null);
      return;
    }

    const newBBox = createBBox(activeLabel, x, y, width, height);
    onAnnotationsChange([...annotations, newBBox]);
    setDrawingBBox(null);
  }, [isDrawing, activeTool, drawingBBox, activeLabel, annotations, onAnnotationsChange]);

  const handleShapeClick = useCallback(
    (id: string, nodeRef: Konva.Node) => {
      if (activeTool === "select") {
        onSelectAnnotation(id);
        selectedShapeRef.current = nodeRef;
      }
    },
    [activeTool, onSelectAnnotation],
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
      onAnnotationsChange(updated);
    },
    [annotations, image, onAnnotationsChange],
  );

  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      if (!image) return;
      const node = e.target;

      const updated = annotations.map((ann) => {
        if (ann.id !== id) return ann;
        if (ann.type === "bbox" || ann.type === "point") {
          return { ...ann, x: toNormalized(node.x(), image.width), y: toNormalized(node.y(), image.height) };
        }
        return ann;
      });
      onAnnotationsChange(updated);
    },
    [annotations, image, onAnnotationsChange],
  );

  // Color per label
  const labelColors: Record<string, string> = {};
  const uniqueLabels = [...new Set(annotations.map((a) => a.label))];
  uniqueLabels.forEach((label, i) => {
    labelColors[label] = PALETTE[i % PALETTE.length];
  });
  if (!labelColors[activeLabel]) {
    labelColors[activeLabel] = PALETTE[uniqueLabels.length % PALETTE.length];
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

          {polygonPoints.length >= 2 && (
            <>
              <Line
                points={polygonPoints.map((p, i) => (i % 2 === 0 ? p * imgWidth : p * imgHeight))}
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

          {activeTool === "sam" && samOverlay}

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

**Step 2: Story を作成**

`src/components/views/annotation-canvas-view.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { Annotation } from "@/lib/types";
import { AnnotationCanvasView } from "./annotation-canvas-view";

const meta = {
  title: "views/AnnotationCanvasView",
  component: AnnotationCanvasView,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onAnnotationsChange: fn(),
    onSelectAnnotation: fn(),
    onImageLoad: fn(),
    onSamClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnnotationCanvasView>;

export default meta;
type Story = StoryObj<typeof meta>;

// Note: imageUrl needs a real image to load in Storybook.
// Use a placeholder or static asset in public/ for demos.

export const EmptyCanvas: Story = {
  args: {
    imageUrl: "https://placehold.co/800x600/1a1a1a/333?text=Sample+Image",
    annotations: [],
    activeTool: "bbox",
    activeLabel: "person",
    selectedAnnotationId: null,
  },
};

export const WithAnnotations: Story = {
  args: {
    imageUrl: "https://placehold.co/800x600/1a1a1a/333?text=Sample+Image",
    annotations: [
      { id: "1" as any, type: "bbox", label: "person", x: 0.1 as any, y: 0.2 as any, width: 0.3 as any, height: 0.4 as any },
      { id: "2" as any, type: "point", label: "car", x: 0.7 as any, y: 0.5 as any },
    ] as Annotation[],
    activeTool: "select",
    activeLabel: "person",
    selectedAnnotationId: "1" as any,
  },
};

export const SamMode: Story = {
  args: {
    imageUrl: "https://placehold.co/800x600/1a1a1a/333?text=Sample+Image",
    annotations: [],
    activeTool: "sam",
    activeLabel: "person",
    selectedAnnotationId: null,
  },
};
```

**Step 3: AnnotationCanvas Container を作成**

`src/components/containers/annotation-canvas.tsx`:

```tsx
"use client";

import { useShallow } from "zustand/react/shallow";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { useSamStore } from "@/lib/stores/sam-store";
import type { NormalizedCoord } from "@/lib/types";
import { SamOverlay } from "@/components/containers/sam-overlay";
import { AnnotationCanvasView } from "@/components/views/annotation-canvas-view";

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

  const handleImageLoad = (width: number, height: number) => {
    useSamStore.getState().setImageDimensions(width, height);
  };

  const handleSamClick = (x: NormalizedCoord, y: NormalizedCoord, clickType: 0 | 1) => {
    useSamStore.getState().addClick({ x, y, clickType });
  };

  return (
    <AnnotationCanvasView
      imageUrl={imageUrl}
      annotations={annotations}
      activeTool={activeTool}
      activeLabel={activeLabel}
      selectedAnnotationId={selectedAnnotationId}
      onAnnotationsChange={updateAnnotations}
      onSelectAnnotation={setSelectedAnnotationId}
      onImageLoad={handleImageLoad}
      onSamClick={handleSamClick}
      samOverlay={<SamOverlay imageWidth={0} imageHeight={0} scale={1} />}
    />
  );
}
```

Note: `SamOverlay` の imageWidth/imageHeight/scale は AnnotationCanvasView 内部で決まるため、Container レベルでは仮の値を渡す。この接続部分は Task 8 で調整する。

**Step 4: Storybook で確認**

Run: `pnpm storybook`
Expected: `views/AnnotationCanvasView` の3つの Story が表示される。プレースホルダー画像が読み込まれ、Canvas が描画される。

**Step 5: Commit**

```bash
git add src/components/views/annotation-canvas-view.tsx src/components/views/annotation-canvas-view.stories.tsx src/components/containers/annotation-canvas.tsx
git commit -m "feat: extract AnnotationCanvasView with Container/Presentational split"
```

---

### Task 8: AnnotationApp Container 再構成

**Files:**
- Create: `src/components/containers/annotation-app.tsx`
- Modify: `src/app/page.tsx`

**Step 1: AnnotationApp Container を作成**

`src/components/containers/annotation-app.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createPolygon } from "@/lib/annotation-factory";
import { maskToPolygon } from "@/lib/sam/mask-to-polygon";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { useSamStore } from "@/lib/stores/sam-store";
import { AppLayout } from "@/components/views/app-layout";
import { AnnotationCanvas } from "@/components/containers/annotation-canvas";
import { ImageSidebar } from "@/components/containers/image-sidebar";
import { ToolPanel } from "@/components/containers/tool-panel";

export function AnnotationApp() {
  const config = useAnnotationStore((s) => s.config);
  const currentImage = useAnnotationStore((s) => s.currentImage);
  const images = useAnnotationStore((s) => s.images);
  const init = useAnnotationStore((s) => s.init);

  useEffect(() => {
    init();
    useSamStore.getState().initDecoder();
  }, [init]);

  useEffect(() => {
    useSamStore.getState().reset();
    if (currentImage) {
      useSamStore.getState().loadEmbedding(currentImage);
    }
  }, [currentImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const store = useAnnotationStore.getState();

      if (store.activeTool === "sam") {
        const samState = useSamStore.getState();
        if (e.key === "Enter" && samState.currentMask) {
          e.preventDefault();
          const result = maskToPolygon(
            samState.currentMask.mask,
            samState.currentMask.width,
            samState.currentMask.height,
          );
          if (result && result.points.length >= 6) {
            const polygon = createPolygon(store.activeLabel, result.points);
            store.updateAnnotations([...store.annotations, polygon]);
          }
          samState.clearClicks();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          samState.clearClicks();
          return;
        }
        if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          samState.removeLastClick();
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case "v":
          store.setActiveTool("select");
          break;
        case "b":
          store.setActiveTool("bbox");
          break;
        case "p":
          store.setActiveTool("polygon");
          break;
        case ".":
          store.setActiveTool("point");
          break;
        case "s":
          store.setActiveTool("sam");
          break;
        case "delete":
        case "backspace":
          if (store.selectedAnnotationId) {
            store.deleteAnnotation(store.selectedAnnotationId);
          }
          break;
        case "arrowleft":
          store.previousImage();
          break;
        case "arrowright":
          store.nextImage();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const header = (
    <header className="h-12 border-b flex items-center justify-between px-4 bg-background">
      <h1 className="text-sm font-semibold">Image Annotation Tool</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open("/api/export/coco", "_blank")}
          >
            Export COCO
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open("/api/export/yolo", "_blank")}
          >
            Export YOLO
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {currentImage && (
            <span>
              {currentImage} ({images.indexOf(currentImage) + 1}/{images.length})
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">V=Select B=BBox P=Polygon .=Point S=SAM Del=Delete</span>
      </div>
    </header>
  );

  const canvas = currentImage ? (
    <AnnotationCanvas />
  ) : (
    <div className="flex-1 flex items-center justify-center bg-neutral-900">
      <p className="text-muted-foreground">Select an image to start annotating</p>
    </div>
  );

  return (
    <AppLayout
      header={header}
      sidebar={<ImageSidebar />}
      canvas={canvas}
      toolPanel={<ToolPanel />}
    />
  );
}
```

**Step 2: `page.tsx` を更新**

`src/app/page.tsx`:

```tsx
import { AnnotationApp } from "@/components/containers/annotation-app";

export default function Home() {
  return <AnnotationApp />;
}
```

**Step 3: ビルド確認**

Run: `pnpm build`
Expected: ビルドが成功する。

**Step 4: 旧コンポーネントファイルを削除**

以下の旧ファイルを削除:
- `src/components/annotation-app.tsx`
- `src/components/annotation-canvas.tsx`
- `src/components/tool-panel.tsx`
- `src/components/image-sidebar.tsx`
- `src/components/sam-overlay.tsx`

Run: `rm src/components/annotation-app.tsx src/components/annotation-canvas.tsx src/components/tool-panel.tsx src/components/image-sidebar.tsx src/components/sam-overlay.tsx`

**Step 5: ビルド再確認**

Run: `pnpm build`
Expected: ビルドが成功する (import パスが全て containers/ に向いていること)。

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire up Container components and migrate page.tsx to new structure"
```

---

### Task 9: Storybook 全体動作確認 & 最終調整

**Files:**
- 各 Story ファイル (修正が必要な場合のみ)

**Step 1: Storybook 全体起動**

Run: `pnpm storybook`
Expected: 以下の Story がすべて表示される:
- `ui/Button` (4 Stories)
- `ui/Badge` (3 Stories)
- `views/AppLayout` (1 Story)
- `views/ImageSidebarView` (3 Stories)
- `views/ToolPanelView` (4 Stories)
- `views/SamOverlayView` (4 Stories)
- `views/AnnotationCanvasView` (3 Stories)

**Step 2: アプリケーション動作確認**

Run: `pnpm dev`
Expected: http://localhost:3000 でアプリが正常動作する。画像選択、ツール切替、アノテーション描画が全て動く。

**Step 3: Lint 確認**

Run: `pnpm lint`
Expected: エラーなし。

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify Storybook and application integration"
```
