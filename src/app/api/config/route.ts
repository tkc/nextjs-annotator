import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/repository";

export async function GET() {
  try {
    const config = loadConfig();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Invalid config" }, { status: 500 });
  }
}
