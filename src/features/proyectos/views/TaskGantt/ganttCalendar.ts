import { calendarDate, calendarDateKey } from "../calendarDate";
import type { Task } from "../types";
import { taskAssignees } from "../taskAssignees";
import type { GanttRow } from "./types";

type DomainWindow = Pick<Task, "start_date" | "due_date">;
type WidgetWindow = Pick<GanttRow, "start" | "end" | "duration" | "gmStartDate" | "gmDueDate">;

function localDay(value: string): Date {
  const date = calendarDate(value);
  date.setHours(0, 0, 0, 0);
  if (calendarDateKey(date) !== value) throw new Error("La zona horaria no permite representar este día.");
  return date;
}

function nextDay(date: Date, offset: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + offset);
  return result;
}

export function toGanttWindow(window: DomainWindow): WidgetWindow {
  const start = localDay(window.start_date);
  const metadata = { gmStartDate: window.start_date, gmDueDate: window.due_date };
  if (window.due_date === null) return metadata;
  const due = localDay(window.due_date);
  if (window.due_date < window.start_date) throw new Error("La fecha límite es anterior al inicio.");
  return { ...metadata, start, end: nextDay(due, 1) };
}

export function fromGanttWindow(window: WidgetWindow): DomainWindow {
  if (window.gmDueDate === null) {
    if (window.start !== undefined || window.end !== undefined || window.duration !== undefined)
      throw new Error("Una tarea sin límite no debe tener un intervalo temporal calculado.");
    localDay(window.gmStartDate);
    return { start_date: window.gmStartDate, due_date: null };
  }
  if (!window.start || !window.end || !Number.isFinite(window.start.getTime()) || !Number.isFinite(window.end.getTime()))
    throw new Error("El intervalo temporal no es válido.");
  const start_date = calendarDateKey(window.start);
  const due_date = calendarDateKey(nextDay(window.end, -1));
  localDay(start_date);
  localDay(due_date);
  if (due_date < start_date) throw new Error("El intervalo temporal debe incluir al menos un día.");
  return { start_date, due_date };
}

export function toGanttRows(tasks: Task[]): GanttRow[] {
  const ids = new Set(tasks.map((task) => task.id));
  if (ids.size !== tasks.length) throw new Error("Se recibieron tareas duplicadas.");
  const parents = new Set(tasks.map((task) => task.parent_id));
  return tasks.map((task) => {
    return {
      id: task.id,
      parent: task.parent_id !== null && ids.has(task.parent_id) ? task.parent_id : 0,
      gmParentId: task.parent_id,
      text: task.name,
      type: task.due_date === null ? "gm-open-ended" : "task",
      gmHasChildren: parents.has(task.id),
      open: true,
      gmStateName: task.state_name,
      gmState: { code: task.state_code, name: task.state_name, category: task.state_category, tema_id: task.state_tema_id },
      gmCreatedAt: task.created_at,
      gmEditable: task.permissions?.edit ?? false,
      gmResponsible: taskAssignees(task).map((person) => person.name).join(", ") || "Sin persona asignada",
      ...toGanttWindow(task),
    };
  });
}

export function ganttRange(rows: GanttRow[]): { start: Date; end: Date } {
  if (!rows.length) throw new Error("No hay tareas para representar.");
  let first = rows[0].gmStartDate;
  let last = rows[0].gmDueDate ?? rows[0].gmStartDate;
  for (const row of rows) {
    if (row.gmStartDate < first) first = row.gmStartDate;
    const end = row.gmDueDate ?? row.gmStartDate;
    if (end > last) last = end;
  }
  return { start: nextDay(localDay(first), -2), end: nextDay(localDay(last), 3) };
}
