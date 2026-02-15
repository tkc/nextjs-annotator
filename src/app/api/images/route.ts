import { NextResponse } from "next/server";
import { listImages } from "@/lib/repository";

export async function GET() {
  const images = listImages();
  return NextResponse.json({ images });
}
