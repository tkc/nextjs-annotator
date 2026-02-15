import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export async function GET() {
  const config = getConfig();
  const imageDir = path.resolve(process.cwd(), config.imageDir);

  if (!fs.existsSync(imageDir)) {
    return NextResponse.json({ images: [] });
  }

  const files = fs.readdirSync(imageDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return [".jpg", ".jpeg", ".png", ".webp", ".bmp"].includes(ext);
  });

  files.sort();
  return NextResponse.json({ images: files });
}
