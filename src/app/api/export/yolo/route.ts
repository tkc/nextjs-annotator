import { NextResponse } from "next/server";
import { listAnnotationFiles, loadConfig } from "@/lib/repository";
import type { BBoxAnnotation, PolygonAnnotation } from "@/lib/types";

export async function GET() {
  const config = loadConfig();
  const labels = config.labels;

  const labelToId: Record<string, number> = {};
  labels.forEach((label, i) => {
    labelToId[label] = i;
  });

  const annotationFiles = listAnnotationFiles(config);

  if (annotationFiles.length === 0) {
    return NextResponse.json({ error: "No annotations found" }, { status: 404 });
  }

  const results: Record<string, string> = {};
  results["classes.txt"] = labels.join("\n");

  annotationFiles.forEach((data) => {
    const baseName = data.imageFile.replace(/\.[^.]+$/, "");
    const lines: string[] = [];

    data.annotations.forEach((ann) => {
      const classId = labelToId[ann.label] ?? 0;

      if (ann.type === "bbox") {
        const bbox = ann as BBoxAnnotation;
        const cx = (bbox.x as number) + (bbox.width as number) / 2;
        const cy = (bbox.y as number) + (bbox.height as number) / 2;
        lines.push(
          `${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${(bbox.width as number).toFixed(6)} ${(bbox.height as number).toFixed(6)}`,
        );
      }

      if (ann.type === "polygon") {
        const poly = ann as PolygonAnnotation;
        const pointsStr = poly.points.map((p) => (p as number).toFixed(6)).join(" ");
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
