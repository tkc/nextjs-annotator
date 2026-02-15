import { type NextRequest, NextResponse } from "next/server";
import { getImageMimeType, readImageFile } from "@/lib/repository";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const buffer = readImageFile(filename);

  if (!buffer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = getImageMimeType(filename);

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType },
  });
}
