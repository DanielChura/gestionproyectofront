import { getAdder, getDiffer, getUnitStart } from "@svar-ui/gantt-store";
import type { IApi } from "@svar-ui/react-gantt";

export type GanttState = ReturnType<IApi["getState"]>;

type GeometryState = { cellWidth?: number; _weekStart?: GanttState["_weekStart"]; _scales?: { start: Date; minUnit: string } | null };

export interface TimelineGeometry {
  toX: (date: Date) => number;
  fromX: (x: number) => Date;
}

export function timelineGeometry(state: GeometryState): TimelineGeometry {
  const scales = state._scales;
  if (!scales) throw new Error("El calendario todavía no está disponible.");
  const width = state.cellWidth ?? 40;
  const unit = scales.minUnit;
  const start = scales.start;
  const toX = (date: Date) => {
    if (unit === "hour")
      return (getDiffer("minute")(date, start) / 60 + date.getSeconds() / 3600 + date.getMilliseconds() / 3600000) * width;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const next = getAdder("day")(day, 1);
    const fraction = (date.getTime() - day.getTime()) / (next.getTime() - day.getTime());
    const first = getUnitStart(unit, day, state._weekStart ?? 1);
    const through = getAdder(unit)(first, 1);
    const count = getDiffer(unit)(first, start);
    return (count + (getDiffer("day")(day, first) + fraction) / getDiffer("day")(through, first)) * width;
  };
  const fromX = (x: number) => {
    const cell = x / width, count = Math.floor(cell);
    const first = getAdder(unit)(start, count);
    const next = getAdder(unit)(first, 1);
    if (unit === "hour")
      return new Date(Math.round(first.getTime() + (cell - count) * (next.getTime() - first.getTime())));
    const days = getDiffer("day")(next, first);
    const partial = (cell - count) * days;
    const whole = Math.floor(partial + 1e-10);
    const day = getAdder("day")(first, whole);
    const end = getAdder("day")(day, 1);
    return new Date(Math.round(day.getTime() + Math.max(0, partial - whole) * (end.getTime() - day.getTime())));
  };
  return { toX, fromX };
}

export function datePosition(date: Date, state: GanttState): number {
  return timelineGeometry(state).toX(date);
}
export function positionDate(x: number, state: GanttState): Date {
  return timelineGeometry(state).fromX(x);
}
export function calendarScrollLeft(date: Date, state: GanttState, center = false): number {
  return Math.max(0, datePosition(date, state) - (center ? (state._chartWidth ?? 0) / 2 : 0));
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
  return `${year} · S${String(week).padStart(2, "0")} · ${format.format(first)} – ${format.format(last)}`;
}

export function headerGeometry(state: GanttState) {
  const scales = state._scales;
  if (!scales) return [];
  const geometry = timelineGeometry(state), width = state._chartWidth ?? scales.width;
  const fullDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "full" });
  return scales.rows.map((row, index) => ({
    height: row.height,
    top: index * row.height,
    cells: row.cells.flatMap((cell, position) => {
      const end = row.cells[position + 1]?.date ?? scales.end;
      const x = geometry.toX(cell.date) - state.scrollLeft, right = geometry.toX(end) - state.scrollLeft;
      if (right <= 0 || x >= width) return [];
      const left = Math.max(0, x);
      return [{ key: cell.date.getTime(), full: x >= 0 && right <= width, left, width: Math.min(right, width) - left, label: cell.value, start: geometry.fromX(state.scrollLeft + left).getTime(), end: geometry.fromX(state.scrollLeft + Math.min(right, width)).getTime(), weekend: ["day", "hour"].includes(cell.unit) && [0, 6].includes(cell.date.getDay()), title: cell.unit === "week" ? isoWeekLabel(cell.date) : fullDate.format(cell.date) + (cell.unit === "hour" ? ` · ${cell.value}` : ""), css: cell.css }];
    }),
  }));
}

export function dependencyPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const exit = x1 + 12,
    entry = x2 - 12;
  const points =
    entry >= exit
      ? [
          [x1, y1],
          [(exit + entry) / 2, y1],
          [(exit + entry) / 2, y2],
          [x2, y2],
        ]
      : [
          [x1, y1],
          [exit, y1],
          [exit, y1 + (y2 >= y1 ? 20 : -20)],
          [entry, y1 + (y2 >= y1 ? 20 : -20)],
          [entry, y2],
          [x2, y2],
        ];
  let path = `M${x1},${y1}`;
  for (let index = 1; index < points.length - 1; index++) {
    const before = points[index - 1],
      here = points[index],
      after = points[index + 1];
    const incoming = Math.hypot(here[0] - before[0], here[1] - before[1]),
      outgoing = Math.hypot(after[0] - here[0], after[1] - here[1]);
    if (!incoming || !outgoing) continue;
    const radius = Math.min(4, incoming / 2, outgoing / 2);
    const a = here.map(
      (value, axis) => value + ((before[axis] - value) * radius) / incoming,
    );
    const b = here.map(
      (value, axis) => value + ((after[axis] - value) * radius) / outgoing,
    );
    path += `L${a[0]},${a[1]}Q${here[0]},${here[1]} ${b[0]},${b[1]}`;
  }
  return path + `L${x2},${y2}`;
}
