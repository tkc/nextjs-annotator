import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getImageMimeType, readImageFile } from "@/lib/repository";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  try {
    const buffer = readImageFile(filename);

    if (!buffer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentType = getImageMimeType(filename);

    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/images/[filename]", method: "GET" },
      extra: { filename },
    });
    return NextResponse.json({ error: "Failed to read image" }, { status: 500 });
  }
}
