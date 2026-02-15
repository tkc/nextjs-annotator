"use client";

import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAnnotationStore } from "@/lib/stores/annotation-store";
import type { ToolType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOOL_LABELS = Object.freeze({
  select: "Select",
  bbox: "BBox",
  polygon: "Polygon",
  point: "Point",
  sam: "SAM",
} as const satisfies Record<ToolType, string>);

const TOOL_SHORTCUTS = Object.freeze({
  select: "V",
  bbox: "B",
  polygon: "P",
  point: ".",
  sam: "S",
} as const satisfies Record<ToolType, string>);

export function ToolPanel() {
  const { activeTool, activeLabel, annotations, selectedAnnotationId, labels } = useAnnotationStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      activeLabel: s.activeLabel,
      annotations: s.annotations,
      selectedAnnotationId: s.selectedAnnotationId,
      labels: s.config?.labels ?? [],
    })),
  );
  const setActiveTool = useAnnotationStore((s) => s.setActiveTool);
  const setActiveLabel = useAnnotationStore((s) => s.setActiveLabel);
  const setSelectedAnnotationId = useAnnotationStore((s) => s.setSelectedAnnotationId);
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation);

  return (
    <div className="w-56 border-l bg-muted/30 flex flex-col">
      {/* Tools */}
      <div className="p-3 border-b">
        <Label className="text-xs text-muted-foreground">Tools</Label>
        <div className="grid grid-cols-2 gap-1 mt-2">
          {(["select", "bbox", "polygon", "point"] as ToolType[]).map((tool) => (
            <Button
              key={tool}
              variant={activeTool === tool ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActiveTool(tool)}
            >
              {TOOL_LABELS[tool]}
              <span className="ml-1 text-muted-foreground text-[10px]">({TOOL_SHORTCUTS[tool]})</span>
            </Button>
          ))}
        </div>
        <Button
          variant={activeTool === "sam" ? "default" : "outline"}
          size="sm"
          className="text-xs w-full mt-1"
          onClick={() => setActiveTool("sam")}
        >
          {TOOL_LABELS.sam}
          <span className="ml-1 text-muted-foreground text-[10px]">({TOOL_SHORTCUTS.sam})</span>
        </Button>
      </div>

      {/* Labels */}
      <div className="p-3 border-b">
        <Label className="text-xs text-muted-foreground">Labels</Label>
        <div className="flex flex-wrap gap-1 mt-2">
          {labels.map((label) => (
            <Badge
              key={label}
              variant={activeLabel === label ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setActiveLabel(label)}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Annotations list */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 pb-1">
          <Label className="text-xs text-muted-foreground">Annotations ({annotations.length})</Label>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                role="option"
                aria-selected={ann.id === selectedAnnotationId}
                tabIndex={0}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors w-full text-left",
                  ann.id === selectedAnnotationId ? "bg-primary/10 border border-primary/30" : "hover:bg-muted",
                )}
                onClick={() => setSelectedAnnotationId(ann.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedAnnotationId(ann.id);
                  }
                }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono">
                    {ann.type === "bbox" ? "B" : ann.type === "polygon" ? "P" : "."}
                  </span>
                  <span className="truncate">{ann.label}</span>
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAnnotation(ann.id);
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
