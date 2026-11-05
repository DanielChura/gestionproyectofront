import { getAdder, getDiffer, getUnitStart } from "@svar-ui/gantt-store";
import type { IScaleConfig } from "@svar-ui/react-gantt";
import { calendarDate, calendarDateKey } from "../calendarDate";
import type { Task } from "../types";
import { isoWeekLabel } from "./ganttGeometry";

export type GanttUnit = "day" | "week" | "month" | "quarter" | "year";
export type GanttScale = GanttUnit | "flexible";
export interface GanttFrame { first: string; last: string; flexible: boolean }
export interface GanttViewport {
  start: Date; end: Date; scale: GanttScale; unit?: GanttUnit; step: number; cellWidth?: number; frame?: GanttFrame;
}

const months = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
const shortMonths = new Intl.DateTimeFormat("es-PE", { month: "short" });
const weekdays = ["do", "lu", "ma", "mi", "ju", "vi", "sá"];
const years = new Intl.DateTimeFormat("es-PE", { year: "numeric" });
const units: GanttUnit[] = ["day", "week", "month", "quarter", "year"];
const widths = { day: 40, week: 280, month: 100, quarter: 120, year: 140 };
const labelWidths = { day: 28, week: 280, month: 64, quarter: 64, year: 72 };

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
  return view.unit ?? (view.scale === "flexible" ? "day" : view.scale);
}

export function centeredViewport(date: Date, scale: GanttScale = "day", unit: GanttUnit = scale === "flexible" ? "day" : scale): GanttViewport {
  const anchor = getUnitStart(unit, date, 1);
  const before = unit === "day" ? 7 : unit === "week" ? 4 : 1;
  const after = unit === "day" ? 49 : unit === "week" ? 24 : unit === "month" ? 18 : 8;
  return { start: getAdder(unit)(anchor, -before), end: getAdder(unit)(anchor, after), scale, unit, step: 1 };
}

export function taskTimelineBounds(tasks: Task[], today: string): Pick<GanttFrame, "first" | "last"> {
  let first = "", last = "";
  for (const task of tasks) {
    if (!first || task.start_date < first) first = task.start_date;
    const end = task.due_date ?? task.start_date;
    if (!last || end > last) last = end;
    if (task.start_date > last) last = task.start_date;
  }
  return { first: first || today, last: last || first || today };
}

export function fitTimelineViewport(first: string, last: string, width: number, flexible = false): GanttViewport {
  const from = ganttDay(first), through = ganttDay(last);
  if (through < from) throw new Error("El fin del intervalo debe ser igual o posterior al inicio.");
  const available = Math.max(1, width);
  let unit: GanttUnit = "year", start = from, end = through, count = 1;
  for (const candidate of units) {
    unit = candidate;
    start = getUnitStart(unit, from, 1);
    end = getAdder(unit)(getUnitStart(unit, through, 1), 1);
    count = Math.max(1, getDiffer(unit)(end, start));
    if (count * labelWidths[unit] <= available) break;
  }
  const perDay = available / Math.max(1, getDiffer("day")(end, start));
  const remaining = getDiffer("day")(end, shiftGanttDay(through, 1)) * perDay;
  if (perDay < 1 && remaining < 4) {
    const extra = Math.max(1, Math.ceil(4 * count / available));
    end = getAdder(unit)(end, extra);
    count += extra;
  }
  const step = unit === "year" ? Math.max(1, Math.ceil(count / Math.max(1, Math.floor(available / 72)))) : 1;
  return { start, end, scale: flexible ? "flexible" : unit, unit, step, cellWidth: Math.ceil(available / count * 1e6) / 1e6,
    frame: { first, last, flexible } };
}

export function fitProjectViewport(tasks: Task[], today: string, width: number): GanttViewport {
  const { first, last } = taskTimelineBounds(tasks, today);
  return fitTimelineViewport(first, last, width);
}

export function viewportCellWidth(view: GanttViewport): number {
  const width = view.cellWidth ?? widths[viewportUnit(view)];
  return viewportUnit(view) === "week" ? width / 7 : width;
}

export function viewportAnchor(view: GanttViewport, left: number): Date {
  const cells = Math.floor(Math.max(0, left) / (view.cellWidth ?? widths[viewportUnit(view)]));
  const unit = viewportUnit(view);
  return getAdder(unit)(getUnitStart(unit, view.start, 1), cells);
}

export function pageViewport(view: GanttViewport, direction: number, width: number, anchor = view.start) {
  const distance = direction * Math.max(1, Math.floor(width / (view.cellWidth ?? widths[viewportUnit(view)])));
  const shift = getAdder(viewportUnit(view));
  return {
    viewport: { ...view, start: shift(view.start, distance), end: shift(view.end, distance), frame: undefined },
    date: shift(anchor, distance),
  };
}

export function viewportContains(view: GanttViewport, date: string): boolean {
  return date >= calendarDateKey(view.start) && date < calendarDateKey(view.end);
}

export function viewportScales(view: GanttViewport): IScaleConfig[] {
  const unit = viewportUnit(view);
  if (unit === "day") return [
    { unit: "month", step: 1, format: (date) => months.format(date) },
    { unit: "day", step: 1, format: (date) => String(date.getDate()) },
  ];
  if (unit === "week") return [
    { unit: "week", step: 1, format: isoWeekLabel },
    { unit: "day", step: 1, format: (date) => `${weekdays[date.getDay()]} ${date.getDate()}` },
  ];
  if (unit === "month") return [
    { unit: "year", step: 1, format: (date) => years.format(date) },
    { unit: "month", step: 1, format: (date) => shortMonths.format(date) },
  ];
  if (unit === "quarter") return [
    { unit: "year", step: 1, format: (date) => years.format(date) },
    { unit: "quarter", step: 1, format: (date) => `T${Math.floor(date.getMonth() / 3) + 1}` },
  ];
  return [
    { unit: "year", step: view.step, format: (date, next) => {
      const end = next && next < view.end ? next : view.end;
      return end.getFullYear() > date.getFullYear() + 1 ? `${years.format(date)}–${end.getFullYear() - 1}` : years.format(date);
    } },
  ];
}
