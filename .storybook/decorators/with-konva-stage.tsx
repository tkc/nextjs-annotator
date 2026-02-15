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
