import type { z } from "zod";
import type {
  annotationSchema,
  bboxAnnotationSchema,
  imageAnnotationSchema,
  imageListResponseSchema,
  pointAnnotationSchema,
  polygonAnnotationSchema,
  projectConfigSchema,
} from "./schemas";

// DeepReadonly ユーティリティ型
// Branded types (number & { __brand }) を壊さないよう、primitive を先に除外
// biome-ignore lint/complexity/noBannedTypes: Function is needed to preserve branded types in DeepReadonly
type DeepReadonly<T> = T extends number | string | boolean | bigint | symbol | null | undefined | Function
  ? T
  : T extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

// Zod スキーマから推論された型 (DeepReadonly でラップ)
export type BBoxAnnotation = DeepReadonly<z.infer<typeof bboxAnnotationSchema>>;
export type PolygonAnnotation = DeepReadonly<z.infer<typeof polygonAnnotationSchema>>;
export type PointAnnotation = DeepReadonly<z.infer<typeof pointAnnotationSchema>>;
export type Annotation = DeepReadonly<z.infer<typeof annotationSchema>>;
export type ImageAnnotation = DeepReadonly<z.infer<typeof imageAnnotationSchema>>;
export type ProjectConfig = DeepReadonly<z.infer<typeof projectConfigSchema>>;
export type ImageListResponse = DeepReadonly<z.infer<typeof imageListResponseSchema>>;

// Branded Types re-export
export type {
  NormalizedCoord,
  PixelCoord,
  PixelDimension,
  UUID,
} from "./branded";
export {
  normalizedCoord,
  pixelCoord,
  pixelDimension,
  toNormalized,
  toPixel,
  uuid,
} from "./branded";
// UI 用の型 (Zod 不要)
export type { AnnotationType, ToolType } from "./schemas";
