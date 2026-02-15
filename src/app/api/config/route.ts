import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return NextResponse.json(config);
}
