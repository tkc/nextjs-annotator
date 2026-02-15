import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ImageAnnotation, BBoxAnnotation, PolygonAnnotation } from "@/lib/types";

function getConfig() {
  const configPath = path.join(process.cwd(), "annotation-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

export async function GET() {
  const config = getConfig();
  const outputDir = path.resolve(process.cwd(), config.outputDir);
  const labels: string[] = config.labels;

  const labelToId: Record<string, number> = {};
  labels.forEach((label: string, i: number) => {
    labelToId[label] = i;
  });

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ error: "No annotations found" }, { status: 404 });
  }

  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith(".json"));
  const results: Record<string, string> = {};

  results["classes.txt"] = labels.join("\n");

  files.forEach((file) => {
    const data: ImageAnnotation = JSON.parse(
      fs.readFileSync(path.join(outputDir, file), "utf-8")
    );
    const baseName = path.basename(file, ".json");
    const lines: string[] = [];

    data.annotations.forEach((ann) => {
      const classId = labelToId[ann.label] ?? 0;

      if (ann.type === "bbox") {
        const bbox = ann as BBoxAnnotation;
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        lines.push(`${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${bbox.width.toFixed(6)} ${bbox.height.toFixed(6)}`);
      }

      if (ann.type === "polygon") {
        const poly = ann as PolygonAnnotation;
        const pointsStr = poly.points.map((p) => p.toFixed(6)).join(" ");
        lines.push(`${classId} ${pointsStr}`);
      }
    });

    results[`${baseName}.txt`] = lines.join("\n");
  });

  return NextResponse.json(results, {
    headers: {
      "Content-Disposition": 'attachment; filename="yolo_annotations.json"',
    },
  });
}
