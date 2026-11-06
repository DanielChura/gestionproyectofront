import type { IApi } from "@svar-ui/react-gantt";

export type GanttState = ReturnType<IApi["getState"]>;

export function datePosition(date: Date, state: GanttState): number {
  const scales = state._scales;
  if (!scales) return NaN;
  return scales.diff(date, scales.start, "day") * (state.cellWidth ?? 40);
}

export function calendarScrollLeft(
  date: Date,
  state: GanttState,
  center = false,
): number {
  return Math.max(
    0,
    datePosition(date, state) - (center ? (state._chartWidth ?? 0) / 2 : 0),
  );
}

export function isoWeekLabel(date: Date): string {
  const day = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const year = day.getUTCFullYear();
  const week = Math.ceil(
    ((day.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7,
  );
  const first = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const last = new Date(first);
  last.setDate(last.getDate() + 6);
  const format = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  });
  return `S${String(week).padStart(2, "0")} · ${format.format(first)} – ${format.format(last)}`;
}

export function dependencyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const exit = x1 + 12,
    entry = x2 - 12;
  if (entry >= exit) {
    const mid = (exit + entry) / 2;
    return `M${x1},${y1}H${mid}V${y2}H${x2}`;
  }
  const lane = y1 + (y2 >= y1 ? 20 : -20);
  return `M${x1},${y1}H${exit}V${lane}H${entry}V${y2}H${x2}`;
}
