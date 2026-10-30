import type { IScaleConfig } from "@svar-ui/react-gantt";
import { calendarDate, calendarDateKey } from "../calendarDate";
import type { Project, Task } from "../types";

export type GanttScale = "day" | "week" | "month";
export interface GanttViewport { start: Date; end: Date; scale: GanttScale; step: number }

const months = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
const years = new Intl.DateTimeFormat("es-PE", { year: "numeric" });
const days = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });

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

export function centeredViewport(date: Date, scale: GanttScale = "day"): GanttViewport {
  const before = scale === "day" ? 7 : scale === "week" ? 28 : 90;
  const after = scale === "day" ? 49 : scale === "week" ? 168 : 640;
  return { start: shiftGanttDay(date, -before), end: shiftGanttDay(date, after), scale, step: 1 };
}

export function fitProjectViewport(project: Pick<Project, "start_date" | "end_date">, tasks: Task[], today: string): GanttViewport {
  const starts = tasks.map((task) => task.start_date);
  const ends = tasks.map((task) => task.due_date ?? task.start_date);
  const first = project.start_date ?? starts.reduce((a, b) => a < b ? a : b, starts[0] ?? today);
  const last = project.end_date ?? ends.reduce((a, b) => a > b ? a : b, first);
  const start = ganttDay(first), end = ganttDay(last < first ? first : last);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const scale = months < 2 ? "day" : months < 8 ? "week" : "month";
  return { start: shiftGanttDay(start, -2), end: shiftGanttDay(end, 3), scale, step: scale === "month" ? Math.max(1, Math.ceil((months + 1) / 18)) : 1 };
}

export function viewportCellWidth(scale: GanttScale): number {
  return scale === "day" ? 40 : scale === "week" ? 96 : 100;
}

export function viewportAnchor(view: GanttViewport, left: number): Date {
  const cells = Math.floor(Math.max(0, left) / viewportCellWidth(view.scale)) * view.step;
  const date = new Date(view.start.getTime());
  if (view.scale === "month") { date.setDate(1); date.setMonth(date.getMonth() + cells); }
  else date.setDate(date.getDate() + cells * (view.scale === "week" ? 7 : 1));
  return date;
}

export function viewportContains(view: GanttViewport, date: string): boolean {
  return date >= calendarDateKey(view.start) && date < calendarDateKey(view.end);
}

export function viewportScales(view: GanttViewport): IScaleConfig[] {
  if (view.scale === "day") return [
    { unit: "month", step: 1, format: (date) => months.format(date) },
    { unit: "day", step: 1, format: (date) => String(date.getDate()) },
  ];
  if (view.scale === "week") return [
    { unit: "month", step: 1, format: (date) => months.format(date) },
    { unit: "week", step: 1, format: (date) => days.format(date) },
  ];
  return [
    { unit: "year", step: Math.max(1, Math.ceil(view.step / 12)), format: (date) => years.format(date) },
    { unit: "month", step: view.step, format: (date) => months.format(date) },
  ];
}
