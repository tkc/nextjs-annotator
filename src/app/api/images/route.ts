import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { listImages } from "@/lib/repository";

export async function GET() {
  try {
    const images = listImages();
    return NextResponse.json({ images });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/images", method: "GET" } });
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 });
  }
}
