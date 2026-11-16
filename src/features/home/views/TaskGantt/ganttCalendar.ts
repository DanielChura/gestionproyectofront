import { scheduleInput } from "../../utils/taskSchedule";
import { calendarDate, calendarDateKey } from "../../utils/calendarDate";
import type { Task } from "../../types";
import { taskAssignees } from "../../utils/taskAssignees";
import { ganttTaskState } from "./ganttTaskState";
import type { ProjectTaskState } from "../../types";
import type { GanttRow } from "./types";

type DomainWindow = Pick<Task, "start_date" | "due_date" | "schedule">;
type WidgetWindow = Pick<
  GanttRow,
  "start" | "end" | "duration" | "gmStartDate" | "gmDueDate" | "gmSchedule"
>;

function localDay(value: string): Date {
  const date = calendarDate(value);
  date.setHours(0, 0, 0, 0);
  if (calendarDateKey(date) !== value)
    throw new Error("La zona horaria no permite representar este día.");
  return date;
}

function nextDay(date: Date, offset: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + offset);
  return result;
}

export function toGanttWindow(window: DomainWindow): WidgetWindow {
  if (window.schedule?.precision === "hour") {
    const start = new Date(window.schedule.start),
      end = window.schedule.end ? new Date(window.schedule.end) : undefined;
    const metadata = {
      gmStartDate: window.start_date,
      gmDueDate: window.due_date,
      gmSchedule: window.schedule,
    };
    if (
      !Number.isFinite(start.getTime()) ||
      (end && end.getTime() - start.getTime() < 3600000)
    )
      throw new Error("El intervalo horario no es válido.");
    return end ? { ...metadata, start, end } : metadata;
  }
  const start = window.start_date ? localDay(window.start_date) : undefined;
  const metadata = {
    gmStartDate: window.start_date,
    gmDueDate: window.due_date,
  };
  if (!start || !window.due_date) return metadata;
  const due = localDay(window.due_date);
  if (window.due_date < window.start_date)
    throw new Error("La fecha límite es anterior al inicio.");
  return { ...metadata, start, end: nextDay(due, 1) };
}

export function fromGanttWindow(window: WidgetWindow): DomainWindow {
  if (window.gmSchedule?.precision === "hour") {
    if (window.gmSchedule.end === null)
      return {
        start_date: window.gmStartDate,
        due_date: null,
        schedule: window.gmSchedule,
      };
    if (
      !window.start ||
      !window.end ||
      window.end.getTime() - window.start.getTime() < 3600000
    )
      throw new Error("El intervalo mínimo es una hora.");
    return {
      start_date: scheduleInput(window.start.toISOString()).split("T")[0],
      due_date: scheduleInput(
        new Date(window.end.getTime() - 1).toISOString(),
      ).split("T")[0],
      schedule: {
        ...window.gmSchedule,
        start: window.start.toISOString(),
        end: window.end.toISOString(),
      },
    };
  }
  if (window.gmDueDate === null) {
    if (
      window.start !== undefined ||
      window.end !== undefined ||
      window.duration !== undefined
    )
      throw new Error(
        "Una tarea sin límite no debe tener un intervalo temporal calculado.",
      );
    localDay(window.gmStartDate);
    return { start_date: window.gmStartDate, due_date: null };
  }
  if (
    !window.start ||
    !window.end ||
    !Number.isFinite(window.start.getTime()) ||
    !Number.isFinite(window.end.getTime())
  )
    throw new Error("El intervalo temporal no es válido.");
  const start_date = calendarDateKey(window.start);
  const due_date = calendarDateKey(nextDay(window.end, -1));
  localDay(start_date);
  localDay(due_date);
  if (due_date < start_date)
    throw new Error("El intervalo temporal debe incluir al menos un día.");
  return { start_date, due_date };
}

export function toGanttRows(
  tasks: Task[],
  states: ProjectTaskState[] = [],
): GanttRow[] {
  const ids = new Set(tasks.map((task) => task.id));
  if (ids.size !== tasks.length)
    throw new Error("Se recibieron tareas duplicadas.");
  const parents = new Set(tasks.map((task) => task.parent_id));
  return tasks.map((task) => {
    return {
      id: task.id,
      parent:
        task.parent_id !== null && ids.has(task.parent_id) ? task.parent_id : 0,
      gmParentId: task.parent_id,
      text: task.name,
      type: !task.start_date || !task.due_date ? "gm-open-ended" : "task",
      gmHasChildren: parents.has(task.id),
      open: true,
      gmStateName: task.state_name,
      gmState: ganttTaskState(task, states),
      gmCreatedAt: task.created_at,
      gmEditable: task.permissions?.edit ?? false,
      gmResponsible:
        taskAssignees(task)
          .map((person) => person.name)
          .join(", ") || "Sin persona asignada",
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
  return {
    start: nextDay(localDay(first), -2),
    end: nextDay(localDay(last), 3),
  };
}
