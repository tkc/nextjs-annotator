import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { createBBox, createPoint, createPolygon } from "@/lib/annotation-factory";
import type { Annotation } from "@/lib/types";
import { ToolPanelView } from "./tool-panel-view";

const SAMPLE_ANNOTATIONS: Annotation[] = [
  createBBox("person", 0.1, 0.2, 0.3, 0.4),
  createPolygon("car", [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
  createPoint("person", 0.5, 0.5),
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
    selectedAnnotationId: SAMPLE_ANNOTATIONS[0].id,
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
