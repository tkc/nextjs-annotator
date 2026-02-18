import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { readImageFile } from "@/lib/repository";
import { encodeImage } from "@/lib/sam/sam-encoder";

/**
 * POST /api/sam/embedding
 * Runs the SAM ViT-B encoder on the specified image and returns
 * the embedding as Float32Array [1, 256, 64, 64] in application/octet-stream.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/sam/embedding", method: "POST" },
    });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const filename = (body as Record<string, unknown>)?.filename;

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  const imageBuffer = readImageFile(filename);
  if (!imageBuffer) {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }

  try {
    const embedding = await encodeImage(imageBuffer);
    const arrayBuffer = embedding.buffer.slice(embedding.byteOffset, embedding.byteOffset + embedding.byteLength);

    return new NextResponse(new Uint8Array(arrayBuffer as ArrayBuffer), {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/sam/embedding", method: "POST" },
      extra: { filename },
    });
    return NextResponse.json(
      { error: `Encoder failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    );
  }
}
