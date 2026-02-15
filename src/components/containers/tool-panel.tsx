"use client";

import { useShallow } from "zustand/react/shallow";
import { ToolPanelView } from "@/components/views/tool-panel-view";
import { useAnnotationStore } from "@/lib/stores/annotation-store";

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
    <ToolPanelView
      activeTool={activeTool}
      onToolChange={setActiveTool}
      labels={labels}
      activeLabel={activeLabel}
      onLabelChange={setActiveLabel}
      annotations={annotations}
      selectedAnnotationId={selectedAnnotationId}
      onSelectAnnotation={setSelectedAnnotationId}
      onDeleteAnnotation={deleteAnnotation}
    />
  );
}
