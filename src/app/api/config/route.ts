import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/repository";

export async function GET() {
  try {
    const config = loadConfig();
    return NextResponse.json(config);
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/config", method: "GET" } });
    return NextResponse.json({ error: "Invalid config" }, { status: 500 });
  }
}
