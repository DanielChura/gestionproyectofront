import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { IApi, IGanttTask } from "@svar-ui/react-gantt";
import type { Task } from "../types";
import type { GanttDependency } from "./ganttQuery";
import { datePosition, dependencyPath } from "./ganttGeometry";
import { ganttDay } from "./ganttViewport";

interface Props {
  api: IApi | null;
  tasks: Task[];
  dependencies: GanttDependency[];
  today: string;
  selected: number | null;
  canLink: boolean;
  onLink: (source: number, target: number) => void;
  onInspect: (source: number, target: number) => void;
}

export default function TaskGanttScene(props: Props) {
  const { api, tasks, dependencies, today, selected } = props;
  const [, paint] = useState(0);
  const [draft, setDraft] = useState<{
    source: number;
    x: number;
    y: number;
  } | null>(null);
  const cleanup = useRef<(() => void) | null>(null),
    canvas = useRef<SVGSVGElement>(null);
  const orderedRows = api?.getState()._tasks;
  const flattened = useMemo(
    () => new Set(orderedRows?.map((row) => Number(row.id))),
    [orderedRows],
  );
  const arrow = useId().replaceAll(":", "");
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
    update();
    return () => {
      for (const stop of unsubscribe) stop?.();
      cancelAnimationFrame(frame);
      api.detach(tag);
      cleanup.current?.();
    };
  }, [api]);
  if (!api) return null;
  const state = api.getState(),
    width = state._chartWidth ?? 0,
    height = state._chartHeight ?? 0,
    header = state._scales?.height ?? 56;
  const visible = state._tasks,
    cellHeight = state.cellHeight ?? 40,
    start = Math.max(0, Math.floor(state.scrollTop / cellHeight) - 1);
  const onscreen = visible.slice(
    start,
    start + Math.ceil(height / cellHeight) + 3,
  );
  function point(id: number, end: boolean) {
    const task = byId.get(id),
      row = api!.getTask(id) as IGanttTask;
    if (!task || !row || !flattened.has(id)) return null;
    const x =
      task.due_date === null
        ? datePosition(ganttDay(task.start_date), state)
        : row.$x + (end ? row.$w : 0);
    return {
      x: x - state.scrollLeft,
      y: row.$y + row.$h / 2 - state.scrollTop,
      neutral: task.due_date === null,
    };
  }
  const edges = new Map<string, GanttDependency>();
  for (const row of onscreen)
    for (const edge of adjacency.get(Number(row.id)) ?? [])
      edges.set(edge.id, edge);
  const todayX = datePosition(ganttDay(today), state) - state.scrollLeft;
  const todayVisible =
    todayX >= 0 &&
    todayX <= width &&
    state._scales &&
    ganttDay(today) >= state._scales.start &&
    ganttDay(today) < state._scales.end;
  function linkDown(event: PointerEvent<SVGCircleElement>, source: number) {
    if (event.button !== 0 || !event.isPrimary || !props.canLink) return;
    event.preventDefault();
    event.stopPropagation();
    cleanup.current?.();
    const svg = canvas.current,
      node = event.currentTarget,
      id = event.pointerId;
    if (!svg) return;
    let ended = false;
    const move = (point: globalThis.PointerEvent) => {
      if (point.pointerId !== id) return;
      const bounds = svg.getBoundingClientRect();
      setDraft({
        source,
        x: point.clientX - bounds.x,
        y: point.clientY - bounds.y,
      });
    };
    const stop = () => {
      if (ended) return;
      ended = true;
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", stop, true);
      document.removeEventListener("keydown", key, true);
      node.removeEventListener("lostpointercapture", stop);
      window.removeEventListener("blur", stop);
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
      setDraft(null);
      cleanup.current = null;
    };
    const key = (point: KeyboardEvent) => {
      if (point.key === "Escape") {
        point.preventDefault();
        stop();
      }
    };
    const up = (point: globalThis.PointerEvent) => {
      if (point.pointerId !== id) return;
      const bounds = svg.getBoundingClientRect(),
        x = point.clientX - bounds.x,
        y = point.clientY - bounds.y;
      const target = onscreen.find((row) => {
        const position = api!.getTask(row.id) as IGanttTask;
        const task = byId.get(Number(row.id));
        const p = pointForTarget(Number(row.id));
        return (
          task?.parent_id === null &&
          task.permissions.dependencies &&
          position &&
          p &&
          Math.abs(x - p.x) < 35 &&
          Math.abs(y - p.y - 14) < 18
        );
      });
      stop();
      if (target && Number(target.id) !== source)
        props.onLink(source, Number(target.id));
    };
    node.setPointerCapture(id);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", stop, true);
    document.addEventListener("keydown", key, true);
    node.addEventListener("lostpointercapture", stop);
    window.addEventListener("blur", stop);
    cleanup.current = stop;
    move(event.nativeEvent);
  }
  function pointForTarget(id: number) {
    const p = point(id, false);
    return p ? { ...p, x: Math.max(8, Math.min(width - 8, p.x)) } : null;
  }
  return (
    <div
      className="gm-gantt-scene"
      style={{
        left: state.gridWidth + 4,
        top: 0,
        width,
        height: height + header,
      }}
    >
      {todayVisible && (
        <div
          className="gm-gantt-today"
          style={{ left: todayX, top: header - 18 }}
        >
          <span>Hoy</span>
        </div>
      )}
      <svg
        ref={canvas}
        className="gm-gantt-links"
        width={width}
        height={height}
        style={{ top: header }}
        aria-label="Dependencias informativas: predecesora bloquea a sucesora"
      >
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8" fill="none" stroke="currentColor" />
          </marker>
        </defs>
        {[...edges.values()].map((edge) => {
          const a = point(edge.predecessor.id, true),
            b = point(edge.successor.id, false);
          if (!a || !b) return null;
          return (
            <path
              key={edge.id}
              data-gantt-link={edge.id}
              className="gm-gantt-link"
              data-related={
                selected === edge.predecessor.id ||
                selected === edge.successor.id ||
                undefined
              }
              d={dependencyPath(a.x, a.y, b.x, b.y)}
              markerEnd={`url(#${arrow})`}
              strokeDasharray={a.neutral || b.neutral ? "4 3" : undefined}
              role="button"
              tabIndex={0}
              aria-label={`${edge.predecessor.name} bloquea a ${edge.successor.name}`}
              onClick={() =>
                props.onInspect(edge.predecessor.id, edge.successor.id)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  props.onInspect(edge.predecessor.id, edge.successor.id);
                }
              }}
            >
              <title>
                {edge.predecessor.name} bloquea a {edge.successor.name}
                {a.neutral || b.neutral
                  ? " · Inicio conocido, sin fin temporal"
                  : ""}
              </title>
            </path>
          );
        })}
        {[
          ...new Set(
            [...edges.values()].flatMap((edge) => [
              edge.predecessor.id,
              edge.successor.id,
            ]),
          ),
        ].map((id) => {
          const p = point(id, false);
          return (
            p?.neutral && (
              <rect
                key={`start:${id}`}
                data-neutral-anchor={id}
                x={p.x - 3}
                y={p.y - 3}
                width={6}
                height={6}
                rx={2}
                fill="var(--color-white)"
                stroke="currentColor"
              >
                <title>
                  Inicio conocido de {byId.get(id)?.name}; sin fecha límite
                </title>
              </rect>
            )
          );
        })}
        {onscreen.map((row) => {
          const task = byId.get(Number(row.id)),
            p = pointForTarget(Number(row.id)),
            end = point(Number(row.id), true);
          if (
            !task ||
            !p ||
            !end ||
            task.parent_id !== null ||
            !task.permissions.dependencies ||
            !props.canLink
          )
            return null;
          return (
            <g
              key={task.id}
              className="gm-gantt-connectors"
              data-selected={
                selected === task.id || draft !== null || undefined
              }
            >
              <circle
                cx={p.x}
                cy={p.y + 14}
                r="5"
                className="gm-gantt-link-target"
                aria-hidden="true"
              />
              <circle
                data-link-source={task.id}
                cx={Math.max(8, Math.min(width - 8, end.x))}
                cy={end.y + 14}
                r="6"
                className="gm-gantt-link-source"
                onPointerDown={(event) => linkDown(event, task.id)}
              >
                <title>
                  Crear dependencia desde {task.name}; alternativa en detalle
                </title>
              </circle>
            </g>
          );
        })}
        {draft &&
          (() => {
            const from = point(draft.source, true);
            return (
              from && (
                <path
                  className="gm-gantt-link gm-gantt-link-preview"
                  d={dependencyPath(
                    Math.max(8, Math.min(width - 8, from.x)),
                    from.y,
                    draft.x,
                    draft.y,
                  )}
                />
              )
            );
          })()}
      </svg>
    </div>
  );
}
