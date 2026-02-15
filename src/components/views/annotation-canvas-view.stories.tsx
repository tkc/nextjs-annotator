import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { createBBox, createPoint } from "@/lib/annotation-factory";
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

const WITH_ANNOTATIONS_SAMPLES: Annotation[] = [createBBox("person", 0.1, 0.2, 0.3, 0.4), createPoint("car", 0.7, 0.5)];

export const WithAnnotations: Story = {
  args: {
    imageUrl: "https://placehold.co/800x600/1a1a1a/333?text=Sample+Image",
    annotations: WITH_ANNOTATIONS_SAMPLES,
    activeTool: "select",
    activeLabel: "person",
    selectedAnnotationId: WITH_ANNOTATIONS_SAMPLES[0].id,
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
