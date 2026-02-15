import { z } from "zod";
import {
  bboxAnnotationSchema,
  polygonAnnotationSchema,
  pointAnnotationSchema,
  annotationSchema,
  imageAnnotationSchema,
  projectConfigSchema,
  imageListResponseSchema,
} from "./schemas";

// Zod スキーマから推論された型
export type BBoxAnnotation = z.infer<typeof bboxAnnotationSchema>;
export type PolygonAnnotation = z.infer<typeof polygonAnnotationSchema>;
export type PointAnnotation = z.infer<typeof pointAnnotationSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type ImageAnnotation = z.infer<typeof imageAnnotationSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type ImageListResponse = z.infer<typeof imageListResponseSchema>;

// UI 用の型 (Zod 不要)
export type { AnnotationType, ToolType } from "./schemas";
