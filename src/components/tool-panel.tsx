"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Annotation, ToolType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToolPanelProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  labels: string[];
  activeLabel: string;
  onLabelChange: (label: string) => void;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
}

const TOOL_LABELS: Record<ToolType, string> = {
  select: "Select",
  bbox: "BBox",
  polygon: "Polygon",
  point: "Point",
};

const TOOL_SHORTCUTS: Record<ToolType, string> = {
  select: "V",
  bbox: "B",
  polygon: "P",
  point: ".",
};

export function ToolPanel({
  activeTool,
  onToolChange,
  labels,
  activeLabel,
  onLabelChange,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}: ToolPanelProps) {
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
              onClick={() => onToolChange(tool)}
            >
              {TOOL_LABELS[tool]}
              <span className="ml-1 text-muted-foreground text-[10px]">
                ({TOOL_SHORTCUTS[tool]})
              </span>
            </Button>
          ))}
        </div>
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
              onClick={() => onLabelChange(label)}
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
          <Label className="text-xs text-muted-foreground">
            Annotations ({annotations.length})
          </Label>
        </div>
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-1">
            {annotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors",
                  ann.id === selectedAnnotationId
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted"
                )}
                onClick={() => onSelectAnnotation(ann.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground font-mono">
                    {ann.type === "bbox" ? "B" : ann.type === "polygon" ? "P" : "."}
                  </span>
                  <span className="truncate">{ann.label}</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(ann.id);
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
