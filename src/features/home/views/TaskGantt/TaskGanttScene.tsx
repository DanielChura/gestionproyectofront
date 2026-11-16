import GanttDependencyLayer from "./GanttDependencyLayer";
import GanttTimeGrid from "./GanttTimeGrid";
import { useGanttChartLayout } from "./useGanttChartLayout";
import { applyGanttBarPresentation } from "./ganttBarPresentation";
import { ganttRangeLabel } from "./ganttRangeLabel";
import { scheduleLabel } from "../../utils/taskSchedule";
import type { useGanttVerticalScroll } from "./useGanttVerticalScroll";
import { useGanttScheduling } from "./useGanttScheduling";
import GanttSchedulingPreview from "./GanttSchedulingPreview";
import type { GanttUnit } from "./ganttViewport";
import type { useGanttCalendar } from "./useGanttCalendar";
import { useLayoutEffect, useEffect, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { Task, Project } from "../../types";
import type { GanttDependency } from "./ganttQuery";
import { datePosition } from "./ganttGeometry";
import { routeGanttDependencies } from "./ganttDependencyRouting";
import { ganttBarGeometry, hasGanttInterval } from "./ganttSceneGeometry";
import { useGanttConnection } from "./useGanttConnection";
import GanttTimelineRows from "./GanttTimelineRows";
import GanttTimeHeader from "./GanttTimeHeader";
import { ganttDay } from "./ganttViewport";
import type { GanttNavigation } from "./ganttNavigation";
import { toGanttWindow } from "./ganttCalendar";
interface Props {
  vertical: ReturnType<typeof useGanttVerticalScroll>;
  project: Project;
  api: IApi | null;
  tasks: Task[];
  dependencies: GanttDependency[];
  today: string;
  unit: GanttUnit;
  navigationKey: string;
  navigation: GanttNavigation;
  onLocate: (id: number) => void;
  calendar: ReturnType<typeof useGanttCalendar>;
  canCreate: boolean;
  onCreateAt: (start: string) => void;
  protectedView: boolean;
  onDates: (
    task: Task,
    initial?: {
      start_date: string;
      due_date: string;
    },
  ) => void;
  onOpen: (id: number) => void;
  onNavigate: () => void;
  canLink: boolean;
  onLink: (
    source: number,
    target: number,
    type?: import("../../types").DependencyType,
  ) => void;
  onInspect: (source: number, target: number) => void;
  onRemove: (source: number, target: number) => void;
}
export default function TaskGanttScene(props: Props) {
  const { api, tasks, dependencies, today } = props;
  const [, paint] = useState(0);
  const region = useRef<HTMLDivElement>(null);
  const chartLayout = useGanttChartLayout(api, region);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const scheduling = useGanttScheduling(region, {
    api,
    height: props.vertical.height,
    project: props.project,
    tasks,
    unit: props.unit,
    enabled: !props.protectedView,
    navigationKey: props.navigationKey,
    canCreate: props.canCreate,
    navigation: props.navigation,
    calendar: props.calendar,
    onDates: props.onDates,
    onCreateAt: props.onCreateAt,
  });
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const adjacency = useMemo(() => {
    const index = new Map<number, GanttDependency[]>();
    for (const edge of dependencies)
      for (const id of [edge.predecessor.id, edge.successor.id]) {
        const group = index.get(id) ?? [];
        group.push(edge);
        index.set(id, group);
      }
    return index;
  }, [dependencies]);
  function sceneRows() {
    if (!api) return [];
    const state = api.getState(),
      cellHeight = state.cellHeight ?? 40;
    const start = Math.max(0, Math.floor(state.scrollTop / cellHeight));
    return state._tasks
      .slice(
        start,
        start + Math.ceil((state._chartHeight ?? 0) / cellHeight) + 1,
      )
      .flatMap((row, index) => {
        const task = byId.get(Number(row.id));
        if (!task) return [];
        const proposal =
          props.calendar.preview?.id === task.id
            ? props.calendar.preview
            : props.calendar.snapshot.get(task.id)?.status === "pending"
              ? props.calendar.snapshot.get(task.id)!.proposal
              : undefined;
        const rendered = proposal ? { ...task, ...proposal } : task;
        const window = toGanttWindow(rendered);
        const x =
          hasGanttInterval(rendered) && window.start
            ? datePosition(window.start, state)
            : undefined;
        const end =
          hasGanttInterval(rendered) && window.end
            ? datePosition(window.end, state)
            : undefined;
        const geometry = ganttBarGeometry(
          rendered,
          {
            $x: x,
            $w: x !== undefined && end !== undefined ? end - x : undefined,
            $y: (start + index) * cellHeight,
          },
          {
            scrollLeft: state.scrollLeft,
            scrollTop: state.scrollTop,
            width: chartLayout.width || state._chartWidth || 0,
            height: props.vertical.height,
            cellHeight,
          },
          (!connection.draft && (hovered === task.id || focused === task.id)) ||
            props.calendar.preview?.id === task.id ||
            connection.draft?.source === task.id,
        );
        return geometry ? [{ task: rendered, geometry }] : [];
      });
  }
  const connection = useGanttConnection(
    api,
    props.canLink,
    region,
    sceneRows,
    props.onLink,
    props.onNavigate,
    props.navigationKey,
    props.navigation,
    { height: props.vertical.height, tasks },
  );
  const currentRows = useRef(sceneRows);
  useLayoutEffect(() => {
    currentRows.current = sceneRows;
  });
  useEffect(() => {
    if (!api) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paint((value) => value + 1));
    };
    const tag = Symbol("gm-gantt-scene");
    const reactive = api.getReactiveState();
    const unsubscribe = [
      reactive.tasks,
      reactive._tasks,
      reactive._scales,
      reactive.scrollLeft,
      reactive.scrollTop,
      reactive.gridWidth,
      reactive._chartWidth,
      reactive._chartHeight,
    ].map((store) => store?.subscribe(update));
    for (const action of [
      "scroll-chart",
      "render-data",
      "resize-chart",
      "resize-grid",
      "open-task",
      "drag-task",
      "select-task",
    ])
      api.on(action, update, { tag });
    const node = region.current?.parentElement;
    const move = (event: globalThis.PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".gm-gantt-links,.gm-gantt-remove-link")
      ) {
        setHovered(null);
        return;
      }
      const bounds = region.current?.getBoundingClientRect(),
        state = api.getState();
      if (!bounds || event.clientX < bounds.left) {
        setHovered(null);
        return;
      }
      const row =
        state._tasks[
          Math.floor(
            (event.clientY -
              bounds.top -
              (state._scales?.height ?? 56) +
              state.scrollTop) /
              (state.cellHeight ?? 40),
          )
        ];
      const bar =
        row &&
        currentRows.current().find((item) => item.task.id === Number(row.id))
          ?.geometry;
      const x = event.clientX - bounds.left;
      const label =
        event.target instanceof Element &&
        event.target.closest<HTMLElement>("[data-gantt-label-task]");
      if (label) {
        setHovered(Number(label.dataset.ganttLabelTask));
        return;
      }
      const inCorridor =
        bar?.real &&
        bar.left !== null &&
        bar.right !== null &&
        x >=
          Math.max(
            0,
            bar.startConnector === null
              ? (bar.displayLeft ?? bar.left)
              : bar.startConnector - 20,
          ) &&
        x <=
          (bar.labelSide === "before"
            ? bar.displayRight! + 24
            : (bar.labelLeft ?? bar.right)) +
            4;
      setHovered(inCorridor ? Number(row.id) : null);
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const bar =
        event.target.closest(
          "[data-gantt-calendar-task],[data-gantt-edit-task],[data-connector-task],[data-gantt-label-task]",
        ) ?? event.target.querySelector("[data-gantt-calendar-task]");
      if (bar instanceof HTMLElement)
        setFocused(
          Number(
            bar.dataset.ganttCalendarTask ??
              bar.dataset.ganttEditTask ??
              bar.dataset.connectorTask ??
              bar.dataset.ganttLabelTask,
          ),
        );
    };
    const blur = () => setFocused(null);
    node?.addEventListener("focusin", focus);
    node?.addEventListener("focusout", blur);
    node?.addEventListener("pointermove", move, true);
    update();
    return () => {
      for (const stop of unsubscribe) stop?.();
      cancelAnimationFrame(frame);
      api.detach(tag);
      node?.removeEventListener("pointermove", move, true);
      node?.removeEventListener("focusin", focus);
      node?.removeEventListener("focusout", blur);
    };
  }, [api]);
  useLayoutEffect(() => {
    applyGanttBarPresentation(
      region.current?.parentElement ?? null,
      currentRows.current(),
    );
  });
  if (!api) return null;
  const state = {
      ...api.getState(),
      _chartWidth: chartLayout.width || api.getState()._chartWidth,
    },
    width = state._chartWidth ?? 0,
    height = props.vertical.height,
    header = state._scales?.height ?? 56;
  const rows = sceneRows();
  const edges = new Map<string, GanttDependency>();
  for (const row of rows)
    for (const edge of adjacency.get(row.task.id) ?? [])
      edges.set(edge.id, edge);
  const routed = routeGanttDependencies(
    rows,
    [...edges.values()],
    width,
    height,
  );
  const todayX = datePosition(ganttDay(today), state) - state.scrollLeft;
  const todayVisible =
    todayX >= 0 &&
    todayX <= width &&
    state._scales &&
    ganttDay(today) >= state._scales.start &&
    ganttDay(today) < state._scales.end;
  return (
    <div
      ref={region}
      className="gm-gantt-scene"
      onPointerLeave={() => {
        setHovered(null);
      }}
      style={{
        left: chartLayout.left,
        top: 0,
        width,
        height: height + header,
      }}
    >
      <GanttTimeGrid state={state} host={chartLayout.grid} />
      <GanttTimeHeader state={state} />
      {todayVisible && (
        <div
          className="gm-gantt-today"
          style={{ left: todayX, top: header }}
          role="img"
          aria-label={"Hoy: " + today}
          title={"Hoy: " + today}
        >
          <span hidden>Hoy</span>
        </div>
      )}
      <GanttDependencyLayer
        model={{
          routes: routed.routes,
          rows,
          width,
          height,
          header,
          activeTask: hovered ?? focused,
          canRemove: props.canLink,
          onInspect: props.onInspect,
          onRemove: props.onRemove,
        }}
      >
        {connection.draft &&
          (() => {
            const sourceTask = byId.get(connection.draft.source);
            const index = state._tasks.findIndex(
              (row) => Number(row.id) === connection.draft!.source,
            );
            const window = sourceTask ? toGanttWindow(sourceTask) : null;
            const left = window?.start
              ? datePosition(window.start, state) - state.scrollLeft
              : null;
            const right = window?.end
              ? datePosition(window.end, state) - state.scrollLeft
              : null;
            const sourceBar = rows.find(
              (row) => row.task.id === connection.draft!.source,
            )?.geometry;
            const source =
              index >= 0 && left !== null && right !== null
                ? {
                    x:
                      connection.draft.side === "start"
                        ? (sourceBar?.startConnector ?? left - 12)
                        : (sourceBar?.endConnector ?? right + 12),
                    y:
                      index * (state.cellHeight ?? 40) +
                      (state.cellHeight ?? 40) / 2 -
                      state.scrollTop,
                  }
                : null;
            return (
              source && (
                <path
                  className="gm-gantt-link gm-gantt-link-preview pointer-events-none! stroke-neutral-600! [stroke-dasharray:5_4]"
                  d={`M${source.x},${source.y}L${connection.draft.x},${connection.draft.y - header}`}
                />
              )
            );
          })()}
      </GanttDependencyLayer>
      {rows
        .filter(
          (row) => row.task.id === (hovered ?? focused) && row.geometry.real,
        )
        .map(({ task, geometry }) => (
          <div
            key={task.id}
            role="tooltip"
            className="pointer-events-none absolute z-30 truncate rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100"
            style={{
              left: Math.max(
                2,
                Math.min(width - 220, geometry.displayLeft ?? 0),
              ),
              top: Math.max(2, header + geometry.y - 42),
              maxWidth: Math.max(0, width - 4),
            }}
          >
            {task.schedule?.precision === "hour"
              ? scheduleLabel(task)
              : ganttRangeLabel(task.start_date, task.due_date)}
          </div>
        ))}
      <GanttSchedulingPreview preview={scheduling} />
      <GanttTimelineRows
        model={{
          rows,
          header,
          width,
          hovered: hovered ?? focused,
          programming: scheduling?.id ?? null,
          connection,
          canLink: props.canLink,
          protectedView: props.protectedView,
          onOpen: props.onOpen,
          onDates: props.onDates,
          onLocate: props.onLocate,
          canEdit: props.calendar.operations.canStart,
        }}
      />
    </div>
  );
}
