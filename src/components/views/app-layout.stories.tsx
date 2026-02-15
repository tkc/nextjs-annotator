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
