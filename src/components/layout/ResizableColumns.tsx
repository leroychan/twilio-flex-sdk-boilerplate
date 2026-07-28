'use client';

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

/**
 * Three-column desktop layout with drag-to-resize dividers. Column widths persist
 * across reloads (autoSaveId → localStorage). Each column scrolls independently.
 */
export function ResizableColumns({
  left,
  middle,
  right,
}: {
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <PanelGroup direction="horizontal" autoSaveId="flex-desktop-columns" className="h-full">
      <Panel defaultSize={24} minSize={16} className="h-full overflow-y-auto">
        {left}
      </Panel>
      <ColumnHandle />
      <Panel defaultSize={50} minSize={30} className="h-full overflow-y-auto">
        {middle}
      </Panel>
      <ColumnHandle />
      <Panel defaultSize={26} minSize={16} className="h-full overflow-y-auto">
        {right}
      </Panel>
    </PanelGroup>
  );
}

function ColumnHandle() {
  return (
    <PanelResizeHandle className="group relative w-2 shrink-0 outline-none">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary" />
    </PanelResizeHandle>
  );
}
