import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { loadAnnotation, saveAnnotation } from "@/lib/repository";
import { imageAnnotationSchema } from "@/lib/schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  try {
    const annotation = loadAnnotation(filename);
    return NextResponse.json(annotation);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/annotations/[filename]", method: "GET" },
      extra: { filename },
    });
    return NextResponse.json({ error: "Failed to load annotation" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/annotations/[filename]", method: "PUT" },
      extra: { filename },
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = imageAnnotationSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 });
  }

  if (result.data.imageFile !== filename) {
    return NextResponse.json(
      { error: "Filename mismatch", details: `URL "${filename}" ≠ body "${result.data.imageFile}"` },
      { status: 400 },
    );
  }

  try {
    saveAnnotation(result.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/annotations/[filename]", method: "PUT" },
      extra: { filename, annotationCount: result.data.annotations.length },
    });
    return NextResponse.json({ error: "Failed to save annotation" }, { status: 500 });
  }
}
