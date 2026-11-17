import { useEffect, useRef, useState } from "react";
import { ApiError, errorText } from "../../../core/api/httpClient";
import { labelSelection } from "./labelSelection";
import { taskAssignees } from "./taskAssignees";
import { StaleTaskResponse, useTaskSync } from "./useTaskSync";
import type { EditTaskPayload, Task, TaskPatchPayload } from "../types";
import { getTaskDetail } from "../services";
import { taskPatchSignature } from "./taskPatch";

export type CalendarProblem =
  "revision" | "key" | "expired" | "pending" | "ambiguous";

type CalendarBase = Pick<
  Task,
  "start_date" | "due_date" | "calendar_revision" | "schedule"
>;

export function calendarProblem(failure: unknown): CalendarProblem | null {
  if (!(failure instanceof ApiError)) return null;
  const code = failure.payload?.code;
  if (failure.status === 409 && code === "calendar_revision_conflict")
    return "revision";
  if (failure.status === 409 && code === "calendar_intent_reused") return "key";
  if (failure.status === 409 && code === "calendar_intent_pending")
    return "pending";
  if (failure.status === 410 && code === "calendar_intent_expired")
    return "expired";
  return failure.status === undefined || failure.status >= 500
    ? "ambiguous"
    : null;
}

export function changedTaskFields(
  base: Task,
  values: Partial<EditTaskPayload>,
): Partial<EditTaskPayload> {
  const original: Record<string, unknown> = {
    ...base,
    ...labelSelection(base.labels),
    responsible_ids: taskAssignees(base).map((person) => person.id),
  };
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      const old = original[key];
      if (key === "schedule" && value && old) {
        const a = old as import("../types").TaskSchedule,
          b = value as import("../types").TaskSchedule;
        if (a.precision === b.precision && a.timezone === b.timezone) {
          if (a.precision === "day")
            return a.start !== b.start || a.end !== b.end;
          return (
            Date.parse(a.start) !== Date.parse(b.start) ||
            (a.end === null) !== (b.end === null) ||
            (a.end !== null &&
              b.end !== null &&
              Date.parse(a.end) !== Date.parse(b.end))
          );
        }
      }
      if (Array.isArray(value) && Array.isArray(old))
        return (
          JSON.stringify([...value].sort()) !== JSON.stringify([...old].sort())
        );
      return JSON.stringify(value) !== JSON.stringify(old);
    }),
  );
}

export function createCalendarIntention() {
  let attempt:
    | {
        signature: string;
        payload: TaskPatchPayload;
        pending?: Promise<void>;
      }
    | undefined;
  return {
    reset() {
      attempt = undefined;
    },
    isPending() {
      return Boolean(attempt?.pending);
    },
    save(
      base: CalendarBase,
      data: Partial<EditTaskPayload>,
      send: (payload: TaskPatchPayload) => Promise<void>,
    ) {
      const hasDates =
        "start_date" in data || "due_date" in data || "schedule" in data;
      if (hasDates && !/^[1-9]\d*$/.test(base.calendar_revision ?? ""))
        return Promise.reject(
          new Error(
            "Falta la revisión de calendario. Consulta la tarea antes de editar fechas.",
          ),
        );
      const signature = taskPatchSignature([
        data,
        hasDates ? base.calendar_revision : null,
      ]);
      if (attempt?.signature !== signature) {
        const content = JSON.parse(
          JSON.stringify(data),
        ) as Partial<EditTaskPayload>;
        const payload = hasDates
          ? {
              ...content,
              expected_calendar_revision: base.calendar_revision,
              calendar_intent_id: crypto.randomUUID(),
            }
          : content;
        attempt = { signature, payload: payload as TaskPatchPayload };
      }
      const current = attempt;
      if (current.pending) return current.pending;
      const operation = Promise.resolve()
        .then(() => send(current.payload))
        .finally(() => {
          if (current.pending === operation) current.pending = undefined;
        });
      current.pending = operation;
      return operation;
    },
  };
}

export function useTaskCalendarEdit(task?: Task) {
  const sync = useTaskSync();
  const [base] = useState(task);
  const [calendar, setCalendar] = useState<CalendarBase | undefined>(task);
  const [problem, setProblem] = useState<CalendarProblem | null>(null);
  const [current, setCurrent] = useState<Task | null>(null);
  const [consultBusy, setConsultBusy] = useState(false),
    [consultError, setConsultError] = useState("");
  const [intention] = useState(createCalendarIntention);
  const alive = useRef(false),
    consulting = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function save(
    values: Partial<EditTaskPayload>,
    send: (payload: TaskPatchPayload) => Promise<void>,
  ) {
    if (!sync.isCurrent())
      return Promise.reject(
        new Error("La sesión o el proyecto cambió. Vuelve a abrir la tarea."),
      );
    if (!base || !calendar)
      return Promise.reject(new Error("No hay tarea para editar."));
    if (problem && ["revision", "key", "expired"].includes(problem))
      return Promise.reject(
        new Error(
          "Consulta las fechas vigentes y decide expresamente si quieres reaplicar el borrador.",
        ),
      );
    const changes = changedTaskFields(base, values);
    if (!Object.keys(changes).length) return Promise.resolve();
    const ticket = sync.token();
    return intention
      .save(calendar, changes, send)
      .then(() => {
        sync.guard(ticket);
        if (!alive.current) throw new StaleTaskResponse();
      })
      .catch((failure: unknown) => {
        if (alive.current && sync.isCurrent())
          setProblem(
            "start_date" in changes ||
              "due_date" in changes ||
              "schedule" in changes
              ? calendarProblem(failure)
              : null,
          );
        throw failure;
      });
  }

  async function consult() {
    if (!base || consulting.current) return;
    consulting.current = true;
    const ticket = sync.token();
    setConsultBusy(true);
    setConsultError("");
    try {
      const result = await sync.read(() =>
        getTaskDetail({ projectId: sync.projectId, taskId: base.id }),
      );
      sync.guard(ticket);
      const saved = sync.current(result.task);
      if (alive.current) setCurrent(saved);
    } catch (failure) {
      if (alive.current && sync.isCurrent())
        setConsultError(errorText(failure));
    } finally {
      consulting.current = false;
      if (alive.current && sync.isCurrent()) setConsultBusy(false);
    }
  }

  function useCurrent() {
    if (!current || problem === "pending" || intention.isPending()) return;
    setCalendar({
      start_date: current.start_date,
      due_date: current.due_date,
      calendar_revision: current.calendar_revision,
      schedule: current.schedule,
    });
    intention.reset();
    setProblem(null);
    setCurrent(null);
    setConsultError("");
  }

  return {
    base,
    calendar,
    save,
    problem,
    current,
    consultBusy,
    consultError,
    consult,
    useCurrent,
    blocked:
      problem === "revision" || problem === "key" || problem === "expired",
  };
}
