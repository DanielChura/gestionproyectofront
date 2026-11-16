import { useCallback, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { TaskGanttProps } from "./types";
import { toGanttRows, toGanttWindow } from "./ganttCalendar";
import { bindGanttReadOnly } from "./ganttReadOnly";
import {
  emptyGanttFilters,
  ganttDependencies,
  ganttProjection,
  hasGanttFilters,
} from "./ganttQuery";
import type { GanttFilters } from "./ganttQuery";
import { ganttDay, taskTimelineBounds, viewportScales } from "./ganttViewport";
import type { GanttScale } from "./ganttViewport";
import { useGanttNavigation } from "./useGanttNavigation";
import { projectToday } from "../../utils/taskGrouping";
import { useGanttToday } from "./useGanttToday";
import { taskAssignees } from "../../utils/taskAssignees";

export function useTaskGantt(
  { tasks, project }: TaskGanttProps,
  allowPreview?: (event: object) => boolean,
  onAttach?: (api: IApi | null) => void,
) {
  const [filters, setFilters] = useState<GanttFilters>({
    ...emptyGanttFilters,
  });
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const [selection, setSelection] = useState<number[]>([]);
  const { navigation, viewport } = useGanttNavigation();
  const [actualGridWidth, setActualGridWidth] = useState<number | null>(null);
  const widget = useRef<IApi | null>(null);
  const [api, setApi] = useState<IApi | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const today = useGanttToday();
  const projection = useMemo(
    () => ganttProjection(tasks, filters, today),
    [tasks, filters, today],
  );
  const filtered = hasGanttFilters(filters);
  const rows = useMemo(
    () =>
      toGanttRows(projection.tasks, project.task_states.states).map((row) => ({
        ...row,
        open: filtered || !collapsed.has(row.id),
        gmContext: !projection.matches.has(row.id),
      })),
    [projection, collapsed, filtered, project.task_states.states],
  );
  const dependencies = useMemo(() => ganttDependencies(tasks), [tasks]);
  const selected = useMemo(() => {
    const ids = new Set(tasks.map((task) => task.id));
    return selection.filter((id) => ids.has(id));
  }, [tasks, selection]);
  const scales = useMemo(() => viewportScales(viewport), [viewport]);
  const people = useMemo(
    () =>
      [
        ...new Map(
          tasks.flatMap(taskAssignees).map((person) => [person.id, person]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [tasks],
  );
  const states = useMemo(
    () => [
      ...new Map([
        ...project.task_states.states.map(
          (state) => [state.code, state.name] as const,
        ),
        ...tasks.map((task) => [task.state_code, task.state_name] as const),
      ]).entries(),
    ],
    [project.task_states.states, tasks],
  );

  const attach = useCallback(
    (api: IApi | null) => {
      cleanup.current?.();
      cleanup.current = null;
      widget.current = api;
      setApi(api);
      onAttach?.(api);
      navigation.attach(api);
      if (api) {
        const unbind = bindGanttReadOnly(api, allowPreview);
        const tag = Symbol("gm-gantt-viewport");
        api.on(
          "resize-chart",
          () => {
            setActualGridWidth(api.getState().gridWidth);
          },
          { tag },
        );
        api.on(
          "resize-grid",
          () => setActualGridWidth(api.getState().gridWidth),
          { tag },
        );
        cleanup.current = () => {
          unbind();
          api.detach(tag);
        };
      }
    },
    [allowPreview, onAttach, navigation],
  );
  const resizeGrid = useCallback((width: number) => {
    void widget.current?.exec("resize-grid", { width });
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
      if (event.mode) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function onSelectTask() {
    const ids =
      widget.current
        ?.getState()
        .selected?.filter((id): id is number => typeof id === "number") ?? [];
    setSelection((current) =>
      current.length === ids.length &&
      current.every((id, index) => id === ids[index])
        ? current
        : ids,
    );
  }
  function locate(id: number) {
    const task = projection.tasks.find((task) => task.id === id);
    if (!task) return;
    const byId = new Map(tasks.map((item) => [item.id, item]));
    const parents = new Set<number>();
    let parent = task.parent_id;
    while (parent !== null && !parents.has(parent)) {
      parents.add(parent);
      parent = byId.get(parent)?.parent_id ?? null;
    }
    setCollapsed(
      (current) => new Set([...current].filter((item) => !parents.has(item))),
    );
    setSelection([id]);
    void widget.current?.exec("select-task", { id, show: "y" });
    navigation.toDate(toGanttWindow(task).start ?? ganttDay(task.start_date));
  }
  function changeScale(scale: GanttScale) {
    navigation.changeScale(scale);
  }
  function zoom(direction: number) {
    navigation.zoom(direction);
  }
  function goToday() {
    navigation.toDate(ganttDay(projectToday()));
  }
  function page(direction: number) {
    navigation.scrollBy(
      direction * (widget.current?.getState()._chartWidth ?? 360) * 0.8,
    );
  }
  function fitProject() {
    const bounds = taskTimelineBounds(tasks, today);
    navigation.fit(bounds.first, bounds.last);
  }
  const manualNavigation = navigation.manual;
  return {
    rows,
    viewport,
    scales,
    selected,
    selectedId: selected.at(-1) ?? null,
    attach,
    resizeGrid,
    toggleBranch,
    onOpenTask,
    onSelectTask,
    filters,
    setFilters,
    filtered,
    projection,
    dependencies,
    people,
    states,
    locate,
    changeScale,
    goToday,
    page,
    fitProject,
    manualNavigation,
    actualGridWidth,
    api,
    today,
    zoom,
    navigation,
  };
}
