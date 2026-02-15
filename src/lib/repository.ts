/**
 * Repository — ファイルシステムとのデータアクセスを一元化
 */

import fs from "node:fs";
import path from "node:path";
import { pixelDimension } from "./branded";
import { imageAnnotationSchema, projectConfigSchema } from "./schemas";
import type { ImageAnnotation, ProjectConfig } from "./types";

const IMAGE_EXTENSIONS = Object.freeze([".jpg", ".jpeg", ".png", ".webp", ".bmp"] as const);

// --- Config ---

export function loadConfig(): ProjectConfig {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return projectConfigSchema.parse(raw);
}

// --- Images ---

function resolveImageDir(config: ProjectConfig): string {
  return path.resolve(process.cwd(), config.imageDir);
}

export function listImages(config?: ProjectConfig): readonly string[] {
  const cfg = config ?? loadConfig();
  const imageDir = resolveImageDir(cfg);

  if (!fs.existsSync(imageDir)) {
    return [];
  }

  return fs
    .readdirSync(imageDir)
    .filter((file) => (IMAGE_EXTENSIONS as readonly string[]).includes(path.extname(file).toLowerCase()))
    .sort();
}

export function readImageFile(filename: string, config?: ProjectConfig): Buffer | null {
  const cfg = config ?? loadConfig();
  const imagePath = path.resolve(resolveImageDir(cfg), filename);

  if (!fs.existsSync(imagePath)) {
    return null;
  }

  return fs.readFileSync(imagePath);
}

export function getImageMimeType(filename: string): string {
  const MIME_TYPES = Object.freeze({
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
  } as const);
  const ext = path.extname(filename).toLowerCase();
  return (MIME_TYPES as Record<string, string>)[ext] || "application/octet-stream";
}

// --- Annotations ---

function resolveOutputDir(config: ProjectConfig): string {
  return path.resolve(process.cwd(), config.outputDir);
}

function annotationFilePath(imageFile: string, config: ProjectConfig): string {
  const outputDir = resolveOutputDir(config);
  const baseName = path.basename(imageFile, path.extname(imageFile));
  return path.join(outputDir, `${baseName}.json`);
}

export function loadAnnotation(imageFile: string, config?: ProjectConfig): ImageAnnotation {
  const cfg = config ?? loadConfig();
  const filePath = annotationFilePath(imageFile, cfg);

  if (!fs.existsSync(filePath)) {
    return Object.freeze({
      imageFile,
      width: pixelDimension(0),
      height: pixelDimension(0),
      annotations: Object.freeze([]),
    }) as ImageAnnotation;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const result = imageAnnotationSchema.safeParse(raw);
  if (!result.success) {
    console.error(`Invalid annotation file ${filePath}:`, result.error.flatten());
    return Object.freeze({
      imageFile,
      width: pixelDimension(0),
      height: pixelDimension(0),
      annotations: Object.freeze([]),
    }) as ImageAnnotation;
  }
  return result.data as ImageAnnotation;
}

export function saveAnnotation(data: ImageAnnotation, config?: ProjectConfig): void {
  const cfg = config ?? loadConfig();
  const outputDir = resolveOutputDir(cfg);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = annotationFilePath(data.imageFile, cfg);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function listAnnotationFiles(config?: ProjectConfig): readonly ImageAnnotation[] {
  const cfg = config ?? loadConfig();
  const outputDir = resolveOutputDir(cfg);

  if (!fs.existsSync(outputDir)) {
    return [];
  }

  return fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((file) => {
      const raw = JSON.parse(fs.readFileSync(path.join(outputDir, file), "utf-8"));
      const result = imageAnnotationSchema.safeParse(raw);
      if (!result.success) {
        console.error(`Invalid annotation file ${file}:`, result.error.flatten());
        return [];
      }
      return [result.data as ImageAnnotation];
    });
}
