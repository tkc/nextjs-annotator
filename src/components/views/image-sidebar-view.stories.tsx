import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ImageSidebarView } from "./image-sidebar-view";

const SAMPLE_IMAGES = ["image_001.jpg", "image_002.jpg", "image_003.jpg", "image_004.jpg", "image_005.jpg"];

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
