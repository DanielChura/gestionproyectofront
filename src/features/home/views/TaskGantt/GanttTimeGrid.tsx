import { createPortal } from "react-dom";
import { headerGeometry } from "./ganttGeometry";
import type { GanttState } from "./ganttGeometry";

export default function GanttTimeGrid({
  state,
  host,
}: {
  state: GanttState;
  host: HTMLElement | null;
}) {
  if (!host) return null;
  const cells = headerGeometry(state).at(-1)?.cells ?? [];
  const rowHeight = state.cellHeight ?? 40,
    first = Math.floor(state.scrollTop / rowHeight);
  const rows = Math.ceil((state._chartHeight ?? 0) / rowHeight) + 1;
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {cells.map((cell) => (
        <div
          key={cell.key}
          data-gantt-grid-start={cell.start}
          data-gantt-grid-end={cell.end}
          data-weekend={cell.weekend || undefined}
          className="absolute inset-y-0 border-r border-neutral-200 data-[weekend]:bg-neutral-50 dark:border-neutral-700 dark:data-[weekend]:bg-neutral-800/40"
          style={{ left: cell.left + state.scrollLeft, width: cell.width }}
        />
      ))}
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={first + index}
          className="absolute inset-x-0 border-b border-neutral-200 dark:border-neutral-700"
          style={{ top: (first + index + 1) * rowHeight }}
        />
      ))}
    </div>,
    host,
  );
}
