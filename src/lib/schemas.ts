import { z } from "zod";

// --- Annotation Schemas ---

export const bboxAnnotationSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("bbox"),
  label: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const polygonAnnotationSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("polygon"),
  label: z.string().min(1),
  points: z.array(z.number().min(0).max(1)).min(6), // 最低3頂点 (x,y) × 3
});

export const pointAnnotationSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("point"),
  label: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const annotationSchema = z.discriminatedUnion("type", [
  bboxAnnotationSchema,
  polygonAnnotationSchema,
  pointAnnotationSchema,
]);

// --- API Request/Response Schemas ---

export const imageAnnotationSchema = z.object({
  imageFile: z.string().min(1),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  annotations: z.array(annotationSchema),
});

export const projectConfigSchema = z.object({
  imageDir: z.string().min(1),
  outputDir: z.string().min(1),
  labels: z.array(z.string().min(1)).min(1),
});

export const imageListResponseSchema = z.object({
  images: z.array(z.string()),
});

// --- Derived Types ---

export type AnnotationType = "bbox" | "polygon" | "point";
export type ToolType = AnnotationType | "select";
