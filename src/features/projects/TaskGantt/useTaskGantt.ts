import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { TaskGanttProps } from "./types";
import { toGanttRows } from "./ganttCalendar";
import { bindGanttReadOnly } from "./ganttReadOnly";
import { emptyGanttFilters, ganttDependencies, ganttProjection, hasGanttFilters } from "./ganttQuery";
import type { GanttFilters } from "./ganttQuery";
import { centeredViewport, fitProjectViewport, ganttDay, shiftGanttDay, viewportAnchor, viewportContains, viewportScales } from "./ganttViewport";
import type { GanttScale } from "./ganttViewport";
import { projectToday } from "../TaskList/taskGrouping";
import { taskAssignees } from "../taskAssignees";

export function useTaskGantt({ tasks, project }: TaskGanttProps) {
  const [filters, setFilters] = useState<GanttFilters>({ ...emptyGanttFilters });
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [selection, setSelection] = useState<number[]>([]);
  const [viewport, setViewport] = useState(() => centeredViewport(ganttDay(projectToday())));
  const [destination, setDestination] = useState<{ id?: number; date: Date } | null>(null);
  const widget = useRef<IApi | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const today = projectToday();
  const projection = useMemo(() => ganttProjection(tasks, filters, today), [tasks, filters, today]);
  const filtered = hasGanttFilters(filters);
  const rows = useMemo(() => toGanttRows(projection.tasks).map((row) => ({
    ...row, open: filtered || !collapsed.has(row.id), gmContext: !projection.matches.has(row.id),
  })), [projection, collapsed, filtered]);
  const dependencies = useMemo(() => ganttDependencies(tasks), [tasks]);
  const selected = useMemo(() => { const ids = new Set(tasks.map((task) => task.id)); return selection.filter((id) => ids.has(id)); }, [tasks, selection]);
  const scales = useMemo(() => viewportScales(viewport), [viewport]);
  const people = useMemo(() => [...new Map(tasks.flatMap(taskAssignees).map((person) => [person.id, person])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, "es")), [tasks]);
  const states = useMemo(() => [...new Map([
    ...project.task_states.states.map((state) => [state.code, state.name] as const),
    ...tasks.map((task) => [task.state_code, task.state_name] as const),
  ]).entries()], [project.task_states.states, tasks]);

  const attach = useCallback((api: IApi | null) => {
    cleanup.current?.();
    cleanup.current = null;
    widget.current = api;
    if (api) cleanup.current = bindGanttReadOnly(api);
  }, []);
  const toggleBranch = useCallback((id: number, expanded: boolean) => {
    void widget.current?.exec("open-task", { id, mode: expanded });
  }, []);
  function onOpenTask(event: { id: string | number; mode: boolean }) {
    if (filtered) return;
    const id = Number(event.id);
    setCollapsed((current) => {
      if (current.has(id) === !event.mode) return current;
      const next = new Set(current);
      if (event.mode) next.delete(id); else next.add(id);
      return next;
    });
  }
  function onSelectTask() {
    const ids = widget.current?.getState().selected?.filter((id): id is number => typeof id === "number") ?? [];
    setSelection((current) => current.length === ids.length && current.every((id, index) => id === ids[index]) ? current : ids);
  }
  function locate(id: number) {
    const task = projection.tasks.find((task) => task.id === id);
    if (!task) return;
    const byId = new Map(tasks.map((item) => [item.id, item]));
    const parents = new Set<number>();
    let parent = task.parent_id;
    while (parent !== null && !parents.has(parent)) { parents.add(parent); parent = byId.get(parent)?.parent_id ?? null; }
    setCollapsed((current) => new Set([...current].filter((item) => !parents.has(item))));
    setSelection([id]);
    if (viewport.step > 1 || !viewportContains(viewport, task.start_date)) setViewport(centeredViewport(ganttDay(task.start_date), viewport.scale));
    setDestination({ id, date: ganttDay(task.start_date) });
  }
  function changeScale(scale: GanttScale) {
    const anchor = viewportAnchor(viewport, widget.current?.getState().scrollLeft ?? 0);
    setViewport(centeredViewport(anchor, scale));
    setDestination({ date: anchor });
  }
  function goToday() {
    const date = ganttDay(projectToday());
    if (viewport.step > 1 || !viewportContains(viewport, projectToday())) setViewport(centeredViewport(date, viewport.scale));
    setDestination({ date });
  }
  function page(direction: number) {
    const anchor = viewportAnchor(viewport, widget.current?.getState().scrollLeft ?? 0);
    const date = shiftGanttDay(anchor, direction * (viewport.scale === "day" ? 35 : viewport.scale === "week" ? 140 : 540));
    setViewport(centeredViewport(date, viewport.scale));
    setDestination({ date });
  }
  function fitProject() {
    const next = fitProjectViewport(project, tasks, today);
    setViewport(next);
    setDestination({ date: next.start });
  }
  useEffect(() => {
    const api = widget.current;
    if (!api || !destination || !rows.length) return;
    let current = true;
    void (async () => {
      if (destination.id !== undefined) await api.exec("select-task", { id: destination.id, show: "y" });
      if (current && widget.current === api) {
        await api.exec("scroll-chart", { date: destination.date });
        if (current && widget.current === api) setDestination(null);
      }
    })();
    return () => { current = false; };
  }, [destination, viewport, rows]);
  return { rows, viewport, scales, selected, selectedId: selected.at(-1) ?? null, attach, toggleBranch, onOpenTask, onSelectTask,
    filters, setFilters, filtered, projection, dependencies, people, states, locate, changeScale, goToday, page, fitProject };
}
