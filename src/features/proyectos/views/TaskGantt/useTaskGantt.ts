import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { calcScaleCellDate } from "@svar-ui/gantt-store";
import type { TaskGanttProps } from "./types";
import { toGanttRows } from "./ganttCalendar";
import { bindGanttReadOnly } from "./ganttReadOnly";
import {
  emptyGanttFilters,
  ganttDependencies,
  ganttProjection,
  hasGanttFilters,
} from "./ganttQuery";
import type { GanttFilters } from "./ganttQuery";
import {
  centeredViewport,
  fitProjectViewport,
  fitTimelineViewport,
  ganttDay,
  pageViewport,
  viewportAnchor,
  viewportContains,
  viewportScales,
  viewportUnit,
} from "./ganttViewport";
import type { GanttScale } from "./ganttViewport";
import { projectToday } from "../TaskList/taskGrouping";
import { useGanttToday } from "./useGanttToday";
import { calendarScrollLeft } from "./ganttGeometry";
import { taskAssignees } from "../taskAssignees";

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
  const [view, setViewport] = useState(() =>
    centeredViewport(ganttDay(projectToday())),
  );
  const [timelineWidth, setTimelineWidth] = useState(360);
  const [actualGridWidth, setActualGridWidth] = useState<number | null>(null);
  const viewport = useMemo(
    () =>
      view.frame
        ? fitTimelineViewport(
            view.frame.first,
            view.frame.last,
            timelineWidth,
            view.frame.flexible,
          )
        : view,
    [view, timelineWidth],
  );
  const [destination, setDestination] = useState<{
    id?: number;
    date: Date;
    center?: boolean;
  } | null>(null);
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
      toGanttRows(projection.tasks).map((row) => ({
        ...row,
        open: filtered || !collapsed.has(row.id),
        gmContext: !projection.matches.has(row.id),
      })),
    [projection, collapsed, filtered],
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
      if (api) {
        const unbind = bindGanttReadOnly(api, allowPreview);
        const tag = Symbol("gm-gantt-viewport");
        api.on(
          "resize-chart",
          ({ width }: { width: number }) => {
            if (width > 0) setTimelineWidth(width);
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
    [allowPreview, onAttach],
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
    if (viewport.frame || !viewportContains(viewport, task.start_date))
      setViewport(
        centeredViewport(
          ganttDay(task.start_date),
          viewport.scale,
          viewportUnit(viewport),
        ),
      );
    setDestination({ id, date: ganttDay(task.start_date) });
  }
  function changeScale(scale: GanttScale) {
    if (scale === "flexible") return;
    const state = widget.current?.getState();
    const anchor = state
      ? calcScaleCellDate(state.scrollLeft, state)
      : viewportAnchor(viewport, 0);
    setViewport(centeredViewport(anchor, scale));
    setDestination({ date: anchor });
  }
  function zoom(direction: number) {
    const state = widget.current?.getState();
    const anchor = state
      ? calcScaleCellDate(state.scrollLeft + timelineWidth / 2, state)
      : viewportAnchor(viewport, 0);
    const choices = ["year", "quarter", "month", "week", "day"] as const;
    const index = choices.indexOf(viewportUnit(viewport));
    const scale = choices[Math.max(0, Math.min(4, index + direction))];
    const next = centeredViewport(anchor, scale);
    setViewport(next);
    setDestination({ date: anchor, center: true });
  }
  function goToday() {
    const date = ganttDay(projectToday());
    if (viewport.frame || !viewportContains(viewport, projectToday()))
      setViewport(
        centeredViewport(date, viewport.scale, viewportUnit(viewport)),
      );
    setDestination({ date });
  }
  function page(direction: number) {
    const state = widget.current?.getState();
    const anchor = state
      ? calcScaleCellDate(state.scrollLeft, state)
      : viewportAnchor(viewport, 0);
    const next = pageViewport(viewport, direction, timelineWidth, anchor);
    setViewport(next.viewport);
    setDestination({ date: next.date });
  }
  function fitProject() {
    const next = fitProjectViewport(tasks, today, timelineWidth);
    setViewport(next);
    setDestination({ date: next.start });
  }
  function setFlexible(first: string, last: string) {
    const next = fitTimelineViewport(first, last, timelineWidth, true);
    setViewport(next);
    setDestination({ date: next.start });
  }
  function manualNavigation() {
    if (!viewport.frame) return;
    setViewport({ ...viewport, frame: undefined });
  }
  useEffect(() => {
    const api = widget.current;
    if (!api || !destination) return;
    let current = true;
    void (async () => {
      if (destination.id !== undefined)
        await api.exec("select-task", { id: destination.id, show: "y" });
      if (current && widget.current === api) {
        await api.exec("scroll-chart", {
          left: calendarScrollLeft(
            destination.date,
            api.getState(),
            destination.center,
          ),
        });
        if (current && widget.current === api) setDestination(null);
      }
    })();
    return () => {
      current = false;
    };
  }, [destination, viewport, rows, timelineWidth]);
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
    setFlexible,
    manualNavigation,
    actualGridWidth,
    api,
    today,
    zoom,
  };
}
