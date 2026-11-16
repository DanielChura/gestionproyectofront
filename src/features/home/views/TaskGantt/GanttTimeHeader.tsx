import type { GanttState } from "./ganttGeometry";
import { headerGeometry } from "./ganttGeometry";
export default function GanttTimeHeader({ state }: { state: GanttState }) {
  return (
    <div
      role="rowgroup"
      aria-label="Escala temporal"
      className="gm-gantt-time-header absolute inset-x-0 top-0 bg-white text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
    >
      {headerGeometry(state).map((row, index) => (
        <div role="row" key={index}>
          {row.cells.map((cell) => (
            <div
              role="columnheader"
              key={cell.key}
              title={cell.title}
              data-gantt-header-full={cell.full || undefined}
              data-gantt-header-start={cell.start}
              data-gantt-header-end={cell.end}
              data-weekend={cell.weekend || undefined}
              className="gm-gantt-time-cell absolute flex items-center justify-center overflow-hidden whitespace-nowrap border-r border-b border-neutral-200 dark:border-neutral-700"
              style={{
                left: cell.left,
                top: row.top,
                width: cell.width,
                height: row.height,
              }}
            >
              <span className="min-w-0 truncate px-1">{cell.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
