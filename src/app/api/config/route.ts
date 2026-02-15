import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { projectConfigSchema } from "@/lib/schemas";

export async function GET() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const result = projectConfigSchema.safeParse(raw);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid config", details: result.error.flatten() },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data);
}
