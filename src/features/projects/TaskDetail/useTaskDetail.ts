import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { errorText } from "../../auth/api";
import { changeTaskState, getTaskActivity, getTaskDetail, getTaskRelations, getTaskSubtasks } from "../services";
import { useTaskSync } from "../useTaskSync";
import type { TaskPatchPayload, Task, TaskIdentity, TaskStatePayload, TaskPage } from "../types";

export function useTaskDetailNavigation() {
  const [selection, setSelection] = useState<{ target: TaskIdentity; section?: "relations" } | null>(null);
  return { target: selection?.target ?? null, initialSection: selection?.section,
    openTaskDetail: (target: TaskIdentity, section?: "relations") => setSelection({ target, section }),
    closeTaskDetail: () => setSelection(null) };
}

export function useTaskResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ source: () => Promise<T>; value: T | null; error: string } | null>(null);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    try {
      const result = await load();
      if (request === version.current) setState({ source: load, value: result, error: "" });
    } catch (failure) {
      if (request === version.current) setState((current) => ({ source: load, value: current?.source === load ? current.value : null, error: errorText(failure) }));
    }
  }, [load]);
  useEffect(() => {
    let active = true;
    const sequence = version;
    void Promise.resolve().then(() => { if (active) void refresh(); });
    return () => { active = false; sequence.current++; };
  }, [refresh]);
  function setValue(next: T | null | ((current: T | null) => T | null)) {
    version.current++;
    setState((current) => ({ source: load,
      value: typeof next === "function" ? (next as (value: T | null) => T | null)(current?.source === load ? current.value : null) : next,
      error: current?.source === load ? current.error : "" }));
  }
  function setError(error: string) { setState((current) => ({ source: load, value: current?.source === load ? current.value : null, error })); }
  return { value: state?.source === load ? state.value : null, setValue, loading: state?.source !== load,
    error: state?.source === load ? state.error : "", setError, refresh, version };
}

export function useTaskPage<T, P extends TaskPage<T>>(load: (cursor: number) => Promise<P>) {
  const resource = useTaskResource(useCallback(() => load(0), [load]));
  const [moreBusy, setMoreBusy] = useState(false);
  const pending = useRef(false);
  async function loadMore() {
    const cursor = resource.value?.next_cursor;
    if (pending.current || cursor == null) return;
    const request = resource.version.current;
    pending.current = true; setMoreBusy(true);
    try {
      const page = await load(cursor);
      if (request !== resource.version.current) return;
      resource.setValue((current) => current ? { ...page, items: [...current.items, ...page.items] } : page);
      resource.setError("");
    } catch (failure) { if (request === resource.version.current) resource.setError(errorText(failure)); }
    finally { pending.current = false; setMoreBusy(false); }
  }
  return { ...resource, moreBusy, loadMore };
}

export function useTaskDetail(target: TaskIdentity, onUpdated: (task: Task) => void, version = 0) {
  const { projectId, taskId } = target;
  const sync = useTaskSync();
  useSyncExternalStore(sync.subscribe, sync.getVersion, sync.getVersion);
  const identity = useMemo(() => ({ projectId, taskId, version }), [projectId, taskId, version]);
  const activeIdentity = useRef(identity);
  const reconciliation = useRef<{ identity: typeof identity; pending: Set<number>; busy: boolean } | null>(null);
  const [relationFailure, setRelationFailure] = useState<{ identity: typeof identity; error: string } | null>(null);
  useEffect(() => { activeIdentity.current = identity; }, [identity]);
  const detail = useTaskResource(useCallback(async () => {
    const result = await sync.read(() => getTaskDetail(identity));
    return { task: sync.observe(result.task), parent: result.parent ? sync.observe(result.parent) : null };
  }, [identity, sync]));
  const children = useTaskPage(useCallback(async (cursor: number) => {
    const page = await sync.read(() => getTaskSubtasks(identity, cursor));
    return { ...page, items: sync.observeMany(page.items) };
  }, [identity, sync]));
  const activity = useTaskPage(useCallback((cursor: number) => sync.read(() => getTaskActivity(identity, cursor)), [identity, sync]));
  const relations = useTaskPage(useCallback((cursor: number) => sync.read(() => getTaskRelations(identity, cursor)), [identity, sync]));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function accept(incoming: Task, confirmed = false) {
    if (!mounted.current || activeIdentity.current !== identity || !sync.isCurrent()) return;
    const saved = confirmed ? sync.current(incoming) : sync.confirm(incoming);
    onUpdated(saved);
    if (saved.id === taskId) detail.setValue((current) => current ? { ...current, task: saved } : current);
    void children.refresh(); void activity.refresh();
  }
  async function mutate(task: Task, data: TaskPatchPayload | TaskStatePayload) {
    if (pending.current) throw new Error("Espera a que termine el guardado.");
    pending.current = true; setBusy(true);
    try {
      const saved = "state_code" in data ? sync.confirm(await changeTaskState(projectId, task.id, data)) : await sync.patch(task.id, data);
      await accept(saved, true);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function relationsChanged(otherTaskId?: number) {
    if (!mounted.current || activeIdentity.current !== identity || !sync.isCurrent()) return;
    if (reconciliation.current?.identity !== identity) reconciliation.current = { identity, pending: new Set(), busy: false };
    const current = reconciliation.current;
    if (otherTaskId !== undefined) current.pending.add(otherTaskId);
    if (current.busy) return;
    current.busy = true;
    const affected = [taskId, ...current.pending].filter((id, index, ids) => ids.indexOf(id) === index);
    void relations.refresh(); void activity.refresh();
    try {
      const saved = await sync.read(() => Promise.all(affected.map((id) => getTaskDetail({ projectId, taskId: id }))));
      if (!mounted.current || activeIdentity.current !== identity || !sync.isCurrent()) return;
      for (const task of sync.confirmMany(saved.map((result) => result.task))) onUpdated(task);
      detail.setValue(saved[0]);
      setRelationFailure(null);
      for (const id of affected) current.pending.delete(id);
    } catch (failure) {
      if (mounted.current && activeIdentity.current === identity && sync.isCurrent())
        setRelationFailure({ identity, error: "El vínculo se guardó. No se pudieron actualizar las tareas afectadas: " + errorText(failure) });
    } finally { current.busy = false; }
  }
  return { detail: { ...detail, value: detail.value ? { task: sync.current(detail.value.task), parent: detail.value.parent ? sync.current(detail.value.parent) : null } : null },
    children: { ...children, value: children.value ? { ...children.value, items: children.value.items.map(sync.current) } : null },
    activity, relations: { ...relations, error: relationFailure?.identity === identity ? relationFailure.error : relations.error },
    retryRelations: () => reconciliation.current?.identity === identity && reconciliation.current.pending.size ? relationsChanged() : relations.refresh(),
    busy, accept, relationsChanged,
    onPatch: (task: Task, data: TaskPatchPayload) => mutate(task, data),
    onState: (task: Task, data: TaskStatePayload) => mutate(task, data) };
}
