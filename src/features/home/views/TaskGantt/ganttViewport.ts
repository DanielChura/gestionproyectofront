import { getAdder, getDiffer, getUnitStart } from "@svar-ui/gantt-store";
import type { IScaleConfig } from "@svar-ui/react-gantt";
import { calendarDate, calendarDateKey } from "../../utils/calendarDate";
import type { Task } from "../../types";
import { isoWeekLabel, timelineGeometry } from "./ganttGeometry";
import { ganttZoom, zoomLevel } from "./ganttZoom";

export type GanttUnit = "day" | "week" | "month" | "quarter" | "year";
export type GanttScale = GanttUnit;
export function normalizeGanttScale(value: unknown): GanttScale {
  return ["day", "week", "month", "quarter", "year"].includes(String(value))
    ? (value as GanttScale)
    : "month";
}
export interface GanttFrame {
  first: string;
  last: string;
}
export interface GanttViewport {
  start: Date;
  end: Date;
  scale: GanttScale;
  unit?: GanttUnit;
  step: number;
  cellWidth?: number;
  zoomLevel?: number;
  frame?: GanttFrame;
}

const months = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
});
const shortMonths = new Intl.DateTimeFormat("es-PE", { month: "short" });
const dayLabel = new Intl.DateTimeFormat("es-PE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const weekdays = ["do", "lu", "ma", "mi", "ju", "vi", "sá"];
const units: GanttUnit[] = ["day", "week", "month", "quarter", "year"];
export function ganttDay(value: string): Date {
  const date = calendarDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function shiftGanttDay(date: Date, days: number): Date {
  const shifted = new Date(date.getTime());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function viewportUnit(view: GanttViewport): GanttUnit {
  return normalizeGanttScale(view.scale);
}

export function centeredViewport(
  date: Date,
  scale: GanttScale = "day",
  level = 5,
  width = 1000,
): GanttViewport {
  const period = normalizeGanttScale(scale),
    zoom = zoomLevel(level);
  const definition = ganttZoom[period];
  const cells = Math.max(
    64,
    Math.min(2048, Math.ceil(width / definition.widths[zoom - 1]) * 7),
  );
  const anchor = getUnitStart(definition.unit, date, 1);
  const start = getAdder(definition.unit)(anchor, -Math.floor(cells / 2));
  return {
    start,
    end: getAdder(definition.unit)(start, cells),
    scale: period,
    unit: period,
    step: 1,
    zoomLevel: zoom,
  };
}

export function taskTimelineBounds(
  tasks: Task[],
  today: string,
): Pick<GanttFrame, "first" | "last"> {
  let first = "",
    last = "";
  for (const task of tasks) {
    if (!first || task.start_date < first) first = task.start_date;
    const end = task.due_date ?? task.start_date;
    if (!last || end > last) last = end;
    if (task.start_date > last) last = task.start_date;
  }
  return { first: first || today, last: last || first || today };
}

export function fitTimelineViewport(
  first: string,
  last: string,
  width: number,
): GanttViewport {
  const from = ganttDay(first),
    through = ganttDay(last);
  if (through < from)
    throw new Error(
      "El fin del intervalo debe ser igual o posterior al inicio.",
    );
  const available = Math.max(1, width);
  let scale: GanttScale = "year",
    level = 1;
  for (const candidate of units) {
    const visual = ganttZoom[candidate];
    const start = getUnitStart(visual.unit, from, 1);
    const end = getAdder(visual.unit)(getUnitStart(visual.unit, through, 1), 1);
    const count = Math.max(1, getDiffer(visual.unit)(end, start));
    if (count * visual.widths[0] <= available) {
      scale = candidate;
      level = visual.widths.reduce(
        (best, cell, index) => (count * cell <= available ? index + 1 : best),
        1,
      );
      break;
    }
  }
  const middle = new Date(
    from.getTime() + (shiftGanttDay(through, 1).getTime() - from.getTime()) / 2,
  );
  const firstUnit = getUnitStart(scale, from, 1);
  let lastUnit = getAdder(scale)(getUnitStart(scale, through, 1), 1);
  const visual = ganttZoom[scale].unit,
    cellWidth = ganttZoom[scale].widths[level - 1];
  const missing =
    Math.ceil(available / cellWidth) - getDiffer(visual)(lastUnit, firstUnit);
  if (missing > 0) lastUnit = getAdder(visual)(lastUnit, missing);
  const count = getDiffer(ganttZoom[scale].unit)(lastUnit, firstUnit);
  const bounded = centeredViewport(middle, scale, level, available);
  return {
    ...bounded,
    ...(count <= 1024 ? { start: firstUnit, end: lastUnit } : {}),
    frame: { first, last },
  };
}

export function fitProjectViewport(
  tasks: Task[],
  today: string,
  width: number,
): GanttViewport {
  const { first, last } = taskTimelineBounds(tasks, today);
  return fitTimelineViewport(first, last, width);
}

export function viewportCellWidth(view: GanttViewport): number {
  return (
    view.cellWidth ??
    ganttZoom[viewportUnit(view)].widths[zoomLevel(view.zoomLevel) - 1]
  );
}
export function viewportGeometry(view: GanttViewport) {
  return timelineGeometry({
    cellWidth: viewportCellWidth(view),
    _weekStart: 1,
    _scales: { start: view.start, minUnit: ganttZoom[viewportUnit(view)].unit },
  });
}
export function viewportAnchor(view: GanttViewport, left: number): Date {
  return viewportGeometry(view).fromX(left);
}
export function pageViewport(
  view: GanttViewport,
  direction: number,
  width: number,
  anchor = view.start,
) {
  const visual = ganttZoom[viewportUnit(view)].unit;
  const count =
    direction *
    Math.max(1, Math.floor((width * 0.8) / viewportCellWidth(view)));
  const shift = getAdder(visual);
  return {
    viewport: {
      ...view,
      start: shift(view.start, count),
      end: shift(view.end, count),
      frame: undefined,
    },
    date: shift(anchor, count),
  };
}

export function viewportContains(view: GanttViewport, date: string): boolean {
  return (
    date >= calendarDateKey(view.start) && date < calendarDateKey(view.end)
  );
}

export function viewportScales(view: GanttViewport): IScaleConfig[] {
  const unit = viewportUnit(view);
  if (unit === "day")
    return [
      { unit: "day", step: 1, format: (date) => dayLabel.format(date) },
      {
        unit: "hour",
        step: 1,
        format: (date) => `${String(date.getHours()).padStart(2, "0")}:00`,
      },
    ];
  if (unit === "week")
    return [
      { unit: "week", step: 1, format: isoWeekLabel },
      {
        unit: "day",
        step: 1,
        format: (date) => `${weekdays[date.getDay()]} ${date.getDate()}`,
      },
    ];
  if (unit === "month")
    return [
      { unit: "month", step: 1, format: (date) => months.format(date) },
      {
        unit: "week",
        step: 1,
        format: (date) => {
          const detail = isoWeekLabel(date),
            monday = getUnitStart("week", date, 1),
            sunday = getAdder("day")(monday, 6);
          return `${detail.match(/S\d+/)?.[0]} · ${monday.getDate()}–${sunday.getDate()}`;
        },
      },
    ];
  if (unit === "quarter")
    return [
      {
        unit: "quarter",
        step: 1,
        format: (date) =>
          `${date.getFullYear()} · Q${Math.floor(date.getMonth() / 3) + 1}`,
      },
      { unit: "month", step: 1, format: (date) => shortMonths.format(date) },
    ];
  return [
    { unit: "year", step: 1, format: (date) => String(date.getFullYear()) },
    {
      unit: "quarter",
      step: 1,
      format: (date) => `Q${Math.floor(date.getMonth() / 3) + 1}`,
    },
  ];
}
