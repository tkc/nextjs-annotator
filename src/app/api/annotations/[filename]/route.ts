import { type NextRequest, NextResponse } from "next/server";
import { loadAnnotation, saveAnnotation } from "@/lib/repository";
import { imageAnnotationSchema } from "@/lib/schemas";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const annotation = loadAnnotation(filename);
  return NextResponse.json(annotation);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const raw = await request.json();
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

  saveAnnotation(result.data);
  return NextResponse.json({ success: true });
}
