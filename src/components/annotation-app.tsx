"use client";

import { useState, useEffect, useCallback } from "react";
import { AnnotationCanvas } from "./annotation-canvas";
import { ImageSidebar } from "./image-sidebar";
import { ToolPanel } from "./tool-panel";
import { Button } from "@/components/ui/button";
import { Annotation, ToolType, ProjectConfig } from "@/lib/types";

export function AnnotationApp() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("bbox");
  const [activeLabel, setActiveLabel] = useState<string>("");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Load config and images
  useEffect(() => {
    async function init() {
      const [configRes, imagesRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/images"),
      ]);
      const configData: ProjectConfig = await configRes.json();
      const imagesData = await imagesRes.json();

      setConfig(configData);
      setImages(imagesData.images);
      if (configData.labels.length > 0) {
        setActiveLabel(configData.labels[0]);
      }
      if (imagesData.images.length > 0) {
        setCurrentImage(imagesData.images[0]);
      }
    }
    init();
  }, []);

  // Load annotations when image changes
  useEffect(() => {
    if (!currentImage) return;
    async function loadAnnotations() {
      const res = await fetch(`/api/annotations/${encodeURIComponent(currentImage!)}`);
      const data = await res.json();
      setAnnotations(data.annotations || []);
      setSelectedAnnotationId(null);
    }
    loadAnnotations();
  }, [currentImage]);

  // Auto-save annotations
  const saveAnnotations = useCallback(
    async (anns: Annotation[]) => {
      if (!currentImage) return;
      const img = new window.Image();
      img.src = `/api/images/${encodeURIComponent(currentImage)}`;
      await new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
        }
      });

      await fetch(`/api/annotations/${encodeURIComponent(currentImage)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageFile: currentImage,
          width: img.naturalWidth,
          height: img.naturalHeight,
          annotations: anns,
        }),
      });
    },
    [currentImage]
  );

  const handleAnnotationsChange = useCallback(
    (newAnnotations: Annotation[]) => {
      setAnnotations(newAnnotations);
      saveAnnotations(newAnnotations);
    },
    [saveAnnotations]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      const updated = annotations.filter((a) => a.id !== id);
      setAnnotations(updated);
      saveAnnotations(updated);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
    },
    [annotations, saveAnnotations, selectedAnnotationId]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "b":
          setActiveTool("bbox");
          break;
        case "p":
          setActiveTool("polygon");
          break;
        case ".":
          setActiveTool("point");
          break;
        case "delete":
        case "backspace":
          if (selectedAnnotationId) {
            handleDeleteAnnotation(selectedAnnotationId);
          }
          break;
        case "arrowleft":
          if (currentImage && images.length > 0) {
            const idx = images.indexOf(currentImage);
            if (idx > 0) setCurrentImage(images[idx - 1]);
          }
          break;
        case "arrowright":
          if (currentImage && images.length > 0) {
            const idx = images.indexOf(currentImage);
            if (idx < images.length - 1) setCurrentImage(images[idx + 1]);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, selectedAnnotationId, currentImage, images, handleDeleteAnnotation]);

  if (!config) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 border-b flex items-center justify-between px-4 bg-background">
        <h1 className="text-sm font-semibold">Image Annotation Tool</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.open("/api/export/coco", "_blank");
              }}
            >
              Export COCO
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.open("/api/export/yolo", "_blank");
              }}
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
          <span className="text-xs text-muted-foreground">
            V=Select B=BBox P=Polygon .=Point Del=Delete
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        <ImageSidebar
          images={images}
          currentImage={currentImage}
          onSelectImage={setCurrentImage}
        />

        {currentImage ? (
          <AnnotationCanvas
            imageUrl={`/api/images/${encodeURIComponent(currentImage)}`}
            annotations={annotations}
            onAnnotationsChange={handleAnnotationsChange}
            activeTool={activeTool}
            activeLabel={activeLabel}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-neutral-900">
            <p className="text-muted-foreground">Select an image to start annotating</p>
          </div>
        )}

        <ToolPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          labels={config.labels}
          activeLabel={activeLabel}
          onLabelChange={setActiveLabel}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onSelectAnnotation={setSelectedAnnotationId}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      </div>
    </div>
  );
}
