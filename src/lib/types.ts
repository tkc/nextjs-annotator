export type AnnotationType = "bbox" | "polygon" | "point";
export type ToolType = AnnotationType | "select";

export interface BBoxAnnotation {
  id: string;
  type: "bbox";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PolygonAnnotation {
  id: string;
  type: "polygon";
  label: string;
  points: number[]; // [x1, y1, x2, y2, ...] normalized coordinates
}

export interface PointAnnotation {
  id: string;
  type: "point";
  label: string;
  x: number;
  y: number;
}

export type Annotation = BBoxAnnotation | PolygonAnnotation | PointAnnotation;

export interface ImageAnnotation {
  imageFile: string;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface ProjectConfig {
  imageDir: string;
  outputDir: string;
  labels: string[];
}
