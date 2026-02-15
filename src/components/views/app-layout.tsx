import type { ReactNode } from "react";

export interface AppLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  canvas: ReactNode;
  toolPanel: ReactNode;
}

export function AppLayout({ header, sidebar, canvas, toolPanel }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      {header}
      <div className="flex-1 flex min-h-0">
        {sidebar}
        {canvas}
        {toolPanel}
      </div>
    </div>
  );
}
