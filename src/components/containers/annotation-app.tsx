"use client";

import { useEffect } from "react";
import { AnnotationCanvas } from "@/components/containers/annotation-canvas";
import { ImageSidebar } from "@/components/containers/image-sidebar";
import { ToolPanel } from "@/components/containers/tool-panel";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/views/app-layout";
import { createPolygon } from "@/lib/annotation-factory";
import { maskToPolygon } from "@/lib/sam/mask-to-polygon";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import { useSamStore } from "@/lib/stores/sam-store";

export function AnnotationApp() {
  const config = useAnnotationStore((s) => s.config);
  const currentImage = useAnnotationStore((s) => s.currentImage);
  const images = useAnnotationStore((s) => s.images);
  const init = useAnnotationStore((s) => s.init);

  useEffect(() => {
    init();
    useSamStore.getState().initDecoder();
  }, [init]);

  useEffect(() => {
    useSamStore.getState().reset();
    if (currentImage) {
      useSamStore.getState().loadEmbedding(currentImage);
    }
  }, [currentImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const store = useAnnotationStore.getState();

      if (store.activeTool === "sam") {
        const samState = useSamStore.getState();
        if (e.key === "Enter" && samState.currentMask) {
          e.preventDefault();
          const result = maskToPolygon(
            samState.currentMask.mask,
            samState.currentMask.width,
            samState.currentMask.height,
          );
          if (result && result.points.length >= 6) {
            const polygon = createPolygon(store.activeLabel, result.points);
            store.updateAnnotations([...store.annotations, polygon]);
          }
          samState.clearClicks();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          samState.clearClicks();
          return;
        }
        if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          samState.removeLastClick();
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case "v":
          store.setActiveTool("select");
          break;
        case "b":
          store.setActiveTool("bbox");
          break;
        case "p":
          store.setActiveTool("polygon");
          break;
        case ".":
          store.setActiveTool("point");
          break;
        case "s":
          store.setActiveTool("sam");
          break;
        case "delete":
        case "backspace":
          if (store.selectedAnnotationId) {
            store.deleteAnnotation(store.selectedAnnotationId);
          }
          break;
        case "arrowleft":
          store.previousImage();
          break;
        case "arrowright":
          store.nextImage();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const header = (
    <header className="h-12 border-b flex items-center justify-between px-4 bg-background">
      <h1 className="text-sm font-semibold">Image Annotation Tool</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open("/api/export/coco", "_blank")}
          >
            Export COCO
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open("/api/export/yolo", "_blank")}
          >
            Export YOLO
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {currentImage && (
            <span>
              {currentImage} ({images.indexOf(currentImage) + 1}/{images.length})
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">V=Select B=BBox P=Polygon .=Point S=SAM Del=Delete</span>
      </div>
    </header>
  );

  const canvas = currentImage ? (
    <AnnotationCanvas />
  ) : (
    <div className="flex-1 flex items-center justify-center bg-neutral-900">
      <p className="text-muted-foreground">Select an image to start annotating</p>
    </div>
  );

  return <AppLayout header={header} sidebar={<ImageSidebar />} canvas={canvas} toolPanel={<ToolPanel />} />;
}
