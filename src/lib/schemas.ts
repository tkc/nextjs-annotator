import { z } from "zod";
import type { NormalizedCoord, PixelDimension, UUID } from "./branded";

// --- Primitive Schemas ---

const normalizedCoord = z
  .number()
  .min(0)
  .max(1)
  .transform((v) => v as NormalizedCoord);
const pixelDimension = z
  .number()
  .int()
  .nonnegative()
  .transform((v) => v as PixelDimension);
const annotationId = z
  .string()
  .uuid()
  .transform((v) => v as UUID);

// --- Annotation Schemas ---

export const bboxAnnotationSchema = z.object({
  id: annotationId,
  type: z.literal("bbox"),
  label: z.string().min(1),
  x: normalizedCoord,
  y: normalizedCoord,
  width: normalizedCoord,
  height: normalizedCoord,
});

export const polygonAnnotationSchema = z.object({
  id: annotationId,
  type: z.literal("polygon"),
  label: z.string().min(1),
  points: z.array(normalizedCoord).min(6),
});

export const pointAnnotationSchema = z.object({
  id: annotationId,
  type: z.literal("point"),
  label: z.string().min(1),
  x: normalizedCoord,
  y: normalizedCoord,
});

export const annotationSchema = z.discriminatedUnion("type", [
  bboxAnnotationSchema,
  polygonAnnotationSchema,
  pointAnnotationSchema,
]);

// --- API Request/Response Schemas ---

export const imageAnnotationSchema = z.object({
  imageFile: z.string().min(1),
  width: pixelDimension,
  height: pixelDimension,
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
export type ToolType = AnnotationType | "select" | "sam";
