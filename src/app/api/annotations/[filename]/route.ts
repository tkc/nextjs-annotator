import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { imageAnnotationSchema } from "@/lib/schemas";
import type { ImageAnnotation } from "@/lib/types";
import { pixelDimension } from "@/lib/branded";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function getAnnotationPath(imageFile: string): string {
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  const baseName = path.basename(imageFile, path.extname(imageFile));
  return path.join(outputDir, `${baseName}.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const annotationPath = getAnnotationPath(filename);

  if (!fs.existsSync(annotationPath)) {
    const empty: ImageAnnotation = {
      imageFile: filename,
      width: pixelDimension(0),
      height: pixelDimension(0),
      annotations: [],
    };
    return NextResponse.json(empty);
  }

  const data = JSON.parse(fs.readFileSync(annotationPath, "utf-8"));
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const annotationPath = getAnnotationPath(filename);
  const raw = await request.json();
  const result = imageAnnotationSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 400 }
    );
  }

  const body = result.data;
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(annotationPath, JSON.stringify(body, null, 2));
  return NextResponse.json({ success: true });
}
