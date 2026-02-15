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
