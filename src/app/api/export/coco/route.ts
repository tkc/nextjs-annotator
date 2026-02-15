import { NextResponse } from "next/server";
import { toPixel } from "@/lib/branded";
import { listAnnotationFiles, loadConfig } from "@/lib/repository";
import type { BBoxAnnotation, PointAnnotation, PolygonAnnotation } from "@/lib/types";

export async function GET() {
  const config = loadConfig();
  const labels = config.labels;

  const categories = labels.map((label, i) => ({
    id: i + 1,
    name: label,
    supercategory: "none",
  }));

  const labelToId: Record<string, number> = {};
  labels.forEach((label, i) => {
    labelToId[label] = i + 1;
  });

  const images: Array<{ id: number; file_name: string; width: number; height: number }> = [];
  const cocoAnnotations: Array<Record<string, unknown>> = [];
  let annotationId = 1;

  const annotationFiles = listAnnotationFiles(config);

  annotationFiles.forEach((data, imageId) => {
    images.push({
      id: imageId + 1,
      file_name: data.imageFile,
      width: data.width,
      height: data.height,
    });

    data.annotations.forEach((ann) => {
      const categoryId = labelToId[ann.label] || 1;

      if (ann.type === "bbox") {
        const bbox = ann as BBoxAnnotation;
        const x = toPixel(bbox.x, data.width);
        const y = toPixel(bbox.y, data.height);
        const w = toPixel(bbox.width, data.width);
        const h = toPixel(bbox.height, data.height);

        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          bbox: [x, y, w, h],
          area: w * h,
          iscrowd: 0,
        });
      }

      if (ann.type === "polygon") {
        const poly = ann as PolygonAnnotation;
        const flatPoints: number[] = [];
        for (let i = 0; i < poly.points.length; i += 2) {
          flatPoints.push(toPixel(poly.points[i], data.width));
          flatPoints.push(toPixel(poly.points[i + 1], data.height));
        }

        const xs = flatPoints.filter((_, i) => i % 2 === 0);
        const ys = flatPoints.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          segmentation: [flatPoints],
          bbox: [minX, minY, maxX - minX, maxY - minY],
          area: (maxX - minX) * (maxY - minY),
          iscrowd: 0,
        });
      }

      if (ann.type === "point") {
        const pt = ann as PointAnnotation;
        cocoAnnotations.push({
          id: annotationId++,
          image_id: imageId + 1,
          category_id: categoryId,
          keypoints: [toPixel(pt.x, data.width), toPixel(pt.y, data.height), 2],
          num_keypoints: 1,
        });
      }
    });
  });

  const coco = {
    images,
    annotations: cocoAnnotations,
    categories,
  };

  return new NextResponse(JSON.stringify(coco, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="coco_annotations.json"',
    },
  });
}
