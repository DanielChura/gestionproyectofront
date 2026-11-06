import { errorText } from "../../auth/api";
import { getTaskDetail } from "../services";
import {
  calendarProblem,
  changedTaskFields,
  createCalendarIntention,
} from "../useTaskCalendarEdit";
import type { CalendarProblem } from "../useTaskCalendarEdit";
import type { TaskSync } from "../useTaskSync";
import type { Task } from "../types";

export type GanttDateChanges = { start_date?: string; due_date?: string };
export interface GanttCalendarOperation {
  id: number;
  name: string;
  base: Task;
  changes: GanttDateChanges;
  proposal: { start_date: string; due_date: string | null };
  status: "pending" | "error" | "prepared" | "success";
  problem: CalendarProblem | null;
  error: string;
  current: Task | null;
  consulting: boolean;
  consultError: string;
  intention: ReturnType<typeof createCalendarIntention>;
}

export function createGanttCalendarOperations(sync: TaskSync) {
  let active = true,
    lifetime = 0,
    version = 0;
  const entries = new Map<number, GanttCalendarOperation>();
  let snapshot: ReadonlyMap<number, GanttCalendarOperation> = new Map();
  const listeners = new Set<() => void>();
  const valid = (entry: GanttCalendarOperation, ticket: number) =>
    active &&
    lifetime === ticket &&
    sync.isCurrent() &&
    entries.get(entry.id) === entry;
  function publish() {
    version++;
    snapshot = new Map([...entries].map(([id, entry]) => [id, { ...entry }]));
    for (const listener of listeners) listener();
  }
  function canStart(task: Task): boolean {
    const current = sync.current(task);
    const operation = entries.get(task.id);
    return (
      active &&
      sync.isCurrent() &&
      !sync.hasPendingCalendar(task.id) &&
      current.permissions.edit &&
      task.due_date !== null &&
      (!operation || operation.status === "success")
    );
  }
  async function send(entry: GanttCalendarOperation) {
    if (
      !active ||
      !sync.isCurrent() ||
      entries.get(entry.id) !== entry ||
      entry.status === "pending"
    )
      return;
    const ticket = lifetime;
    entry.status = "pending";
    entry.error = "";
    entry.consultError = "";
    entry.current = null;
    publish();
    let confirmed: Task | undefined;
    try {
      await entry.intention.save(entry.base, entry.changes, async (payload) => {
        confirmed = await sync.patch(entry.id, payload);
      });
      if (!valid(entry, ticket)) return;
      entry.status = "success";
      entry.problem = null;
      entry.current = sync.current(confirmed ?? entry.base);
      publish();
    } catch (failure) {
      if (!valid(entry, ticket)) return;
      entry.status = "error";
      entry.error = errorText(failure);
      entry.problem = calendarProblem(failure);
      publish();
    }
  }
  function commit(base: Task, changes: GanttDateChanges): boolean {
    if (!canStart(base)) return false;
    const values = changedTaskFields(base, changes) as GanttDateChanges;
    if (!Object.keys(values).length) return false;
    for (const [id, entry] of entries)
      if (entry.status === "success") entries.delete(id);
    const entry: GanttCalendarOperation = {
      id: base.id,
      name: base.name,
      base: { ...base },
      changes: { ...values },
      proposal: {
        start_date: base.start_date,
        due_date: base.due_date,
        ...values,
      },
      status: "prepared",
      problem: null,
      error: "",
      current: null,
      consulting: false,
      consultError: "",
      intention: createCalendarIntention(),
    };
    entries.set(base.id, entry);
    void send(entry);
    return true;
  }
  async function consult(id: number) {
    const entry = entries.get(id);
    if (
      !entry ||
      entry.status === "pending" ||
      entry.consulting ||
      !active ||
      !sync.isCurrent()
    )
      return;
    const ticket = lifetime,
      syncTicket = sync.token();
    entry.consulting = true;
    entry.consultError = "";
    publish();
    try {
      const result = await sync.read(() =>
        getTaskDetail({ projectId: sync.projectId, taskId: id }),
      );
      sync.guard(syncTicket);
      if (!valid(entry, ticket)) return;
      entry.current = sync.observe(result.task);
    } catch (failure) {
      if (valid(entry, ticket)) entry.consultError = errorText(failure);
    } finally {
      if (valid(entry, ticket)) {
        entry.consulting = false;
        publish();
      }
    }
  }
  function prepare(id: number) {
    const entry = entries.get(id);
    if (
      !entry?.current ||
      entry.status === "pending" ||
      entry.consulting ||
      entry.problem === "pending" ||
      !active ||
      !sync.isCurrent()
    )
      return;
    entry.base = { ...entry.current };
    entry.changes = changedTaskFields(
      entry.base,
      entry.changes,
    ) as GanttDateChanges;
    entry.proposal = {
      start_date: entry.base.start_date,
      due_date: entry.base.due_date,
      ...entry.changes,
    };
    entry.intention.reset();
    entry.status = "prepared";
    entry.problem = null;
    entry.current = null;
    entry.error = "";
    publish();
  }
  function savePrepared(id: number) {
    const entry = entries.get(id);
    if (entry?.status !== "prepared") return;
    if (!Object.keys(entry.changes).length) {
      entry.status = "success";
      entry.current = sync.current(entry.base);
      publish();
      return;
    }
    void send(entry);
  }
  function retry(id: number) {
    const entry = entries.get(id);
    if (
      entry?.status === "error" &&
      (entry.problem === "ambiguous" || entry.problem === "pending")
    )
      void send(entry);
  }
  function discard(id: number) {
    const entry = entries.get(id);
    if (
      !entry ||
      entry.status === "pending" ||
      entry.consulting ||
      entry.problem === "pending" ||
      (entry.problem === "ambiguous" && !entry.current)
    )
      return;
    entries.delete(id);
    publish();
  }
  return {
    canStart,
    commit,
    consult,
    prepare,
    savePrepared,
    retry,
    discard,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getVersion: () => version,
    activate: () => {
      active = true;
      lifetime++;
    },
    dispose: () => {
      active = false;
      lifetime++;
      entries.clear();
      snapshot = new Map();
    },
  };
}
