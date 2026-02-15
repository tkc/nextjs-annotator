/**
 * Annotation Factory — アノテーションオブジェクトの生成を一元化
 */

import { v4 as uuidv4 } from "uuid";
import type { NormalizedCoord, UUID } from "./branded";
import { normalizedCoord, pixelDimension, uuid } from "./branded";
import type { BBoxAnnotation, ImageAnnotation, PointAnnotation, PolygonAnnotation } from "./types";

// --- Annotation Factories ---

export function createBBox(label: string, x: number, y: number, width: number, height: number): BBoxAnnotation {
  return Object.freeze({
    id: uuid(uuidv4()),
    type: "bbox" as const,
    label,
    x: normalizedCoord(x),
    y: normalizedCoord(y),
    width: normalizedCoord(width),
    height: normalizedCoord(height),
  });
}

export function createPolygon(label: string, points: readonly number[]): PolygonAnnotation {
  return Object.freeze({
    id: uuid(uuidv4()),
    type: "polygon" as const,
    label,
    points: Object.freeze(points.map(normalizedCoord)) as readonly NormalizedCoord[],
  });
}

export function createPoint(label: string, x: number, y: number): PointAnnotation {
  return Object.freeze({
    id: uuid(uuidv4()),
    type: "point" as const,
    label,
    x: normalizedCoord(x),
    y: normalizedCoord(y),
  });
}

// --- ImageAnnotation Factory ---

export function createEmptyImageAnnotation(imageFile: string): ImageAnnotation {
  return Object.freeze({
    imageFile,
    width: pixelDimension(0),
    height: pixelDimension(0),
    annotations: Object.freeze([]),
  });
}

// --- ID Generation ---

export function generateId(): UUID {
  return uuid(uuidv4());
}
