import { createContext, useContext } from "react";
import { ApiError, sessionVersion } from "../auth/api";
import { updateTask } from "./services";
import { taskPatchSignature } from "./taskPatch";
import { reconcileTask, reconcileTasks } from "./taskCollection";
import type { Task, TaskPatchPayload } from "./types";

export class StaleTaskResponse extends Error {
  constructor() { super("La vista o la sesión cambió. Vuelve a consultar la tarea."); }
}

export function createTaskSync(projectId: number, epoch: number) {
  let active = true, lifetime = 0, generation = 0, version = 0;
  const tasks = new Map<number, Task>();
  let snapshot: ReadonlyMap<number, Task> = new Map();
  const listeners = new Set<() => void>();
  const pending = new Map<string, { fingerprint: string; operation: Promise<Task> }>();
  const isCurrent = () => active && epoch === sessionVersion();
  const token = () => lifetime;
  function guard(ticket = lifetime) {
    if (!isCurrent() || ticket !== lifetime) throw new StaleTaskResponse();
  }
  function publish() { snapshot = new Map(tasks); version++; for (const listener of listeners) listener(); }
  function storeMany(incoming: Task[], fields?: string[]) {
    guard();
    const prepared = incoming.map((task) => reconcileTask(tasks.get(task.id), task, fields));
    const merged = reconcileTasks([...tasks.values()], prepared);
    for (const task of merged) {
      const stored = { ...task };
      delete stored.calendar_receipt;
      tasks.set(task.id, stored);
    }
    return incoming.map((task) => ({ ...tasks.get(task.id)!, ...(task.calendar_receipt ? { calendar_receipt: task.calendar_receipt } : {}) }));
  }
  function observe(task: Task) { const [saved] = storeMany([task]); publish(); return saved; }
  function observeMany(items: Task[]) { const saved = storeMany(items); publish(); return saved; }
  function confirm(task: Task, fields?: string[]) {
    const [saved] = storeMany([task], fields);
    generation++; publish();
    return saved;
  }
  function confirmMany(items: Task[]) {
    const saved = storeMany(items);
    generation++; publish();
    return saved;
  }
  async function read<T>(load: () => Promise<T>): Promise<T> {
    const ticket = lifetime;
    for (let attempt = 0; attempt < 2; attempt++) {
      guard(ticket);
      const started = generation;
      try {
        const result = await load();
        guard(ticket);
        if (started === generation) return result;
      } catch (failure) {
        guard(ticket);
        if (started === generation) throw failure;
      }
    }
    throw new StaleTaskResponse();
  }
  function patch(taskId: number, payload: TaskPatchPayload): Promise<Task> {
    guard();
    const ticket = lifetime;
    const key = "calendar_intent_id" in payload ? `${taskId}:${payload.calendar_intent_id}` : null;
    const fingerprint = taskPatchSignature(payload);
    const existing = key ? pending.get(key) : undefined;
    if (existing) {
      if (existing.fingerprint === fingerprint) return existing.operation;
      const error = new ApiError("La intención pendiente tiene otro contenido.");
      error.status = 409; error.payload = { code: "calendar_intent_reused" };
      return Promise.reject(error);
    }
    const operation = updateTask(projectId, taskId, payload).then((saved) => {
      guard(ticket);
      return confirm(saved, Object.keys(payload));
    }).finally(() => {
      if (key && pending.get(key)?.operation === operation) {
        pending.delete(key);
        if (isCurrent()) publish();
      }
    });
    if (key) { pending.set(key, { fingerprint, operation }); publish(); }
    return operation;
  }
  return { projectId, epoch, isCurrent, token, guard, read, patch, observe, observeMany, confirm, confirmMany,
    hasPendingCalendar: (taskId: number) => [...pending.keys()].some((key) => key.startsWith(String(taskId) + ":")),
    current: (task: Task) => reconcileTask(task, tasks.get(task.id) ?? task),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    getVersion: () => version, getSnapshot: () => snapshot,
    activate: () => { active = true; lifetime++; },
    dispose: () => { active = false; lifetime++; generation++; pending.clear(); tasks.clear(); },
  };
}

export type TaskSync = ReturnType<typeof createTaskSync>;
export const TaskSyncContext = createContext<TaskSync | null>(null);
export function useTaskSync() {
  const sync = useContext(TaskSyncContext);
  if (!sync) throw new Error("La edición requiere el espacio de trabajo del proyecto.");
  return sync;
}
