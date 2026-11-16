import type { IApi } from "@svar-ui/react-gantt";
import { datePosition } from "./ganttGeometry";
import { toGanttWindow } from "./ganttCalendar";

export function bindGanttBarLayout(
  api: IApi,
  layout: (api: IApi, id: number, left: number, width: number) => void,
  dragging: (id: number) => boolean,
) {
  let active = true,
    queued = false,
    applying = false;
  const flush = () => {
    queued = false;
    if (!active) return;
    const state = api.getState();
    if (!state._scales) return;
    const height = state.cellHeight ?? 40,
      first = Math.max(0, Math.floor(state.scrollTop / height));
    const rows = state._tasks.slice(
      first,
      first + Math.ceil((state._chartHeight ?? 600) / height) + 2,
    );
    applying = true;
    try {
      for (const row of rows) {
        const id = Number(row.id);
        if (row.gmFooter || dragging(id)) continue;
        const window = toGanttWindow({
          start_date: row.gmStartDate,
          due_date: row.gmDueDate,
          schedule: row.gmSchedule,
        });
        if (!window.start || !window.end) continue;
        const left = datePosition(window.start, state),
          width = datePosition(window.end, state) - left;
        if (
          Math.abs((row.$x ?? NaN) - left) > 0.001 ||
          Math.abs((row.$w ?? NaN) - width) > 0.001
        )
          layout(api, id, left, width);
      }
    } finally {
      applying = false;
    }
  };
  const schedule = () => {
    if (!active || queued || applying) return;
    queued = true;
    queueMicrotask(flush);
  };
  const state = api.getReactiveState();
  const stops = [
    state._tasks.subscribe(schedule),
    state._scales?.subscribe(schedule),
  ];
  const tag = Symbol("gm-gantt-bar-layout");
  api.on("scroll-chart", schedule, { tag });
  schedule();
  return () => {
    active = false;
    stops.forEach((stop) => stop?.());
    api.detach(tag);
  };
}
