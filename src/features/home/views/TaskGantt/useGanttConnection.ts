import { useLayoutEffect, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { Task, DependencyType } from "../../types";
import type { ganttBarGeometry } from "./ganttSceneGeometry";
import type { GanttNavigation } from "./ganttNavigation";
import {
  ganttConnectionTarget,
  ganttConnectionTargets,
} from "./ganttConnectionTarget";
import type { ConnectionSide } from "./ganttConnectionTarget";
import { suppressGanttClick } from "./ganttResidualClick";
export interface ConnectionRow {
  task: Task;
  geometry: NonNullable<ReturnType<typeof ganttBarGeometry>>;
}
export function useGanttConnection(
  api: IApi | null,
  enabled: boolean,
  region: RefObject<HTMLDivElement | null>,
  rows: () => ConnectionRow[],
  onLink: (source: number, target: number, type?: DependencyType) => void,
  onNavigate: () => void,
  navigationKey?: string,
  navigation?: GanttNavigation,
  model?: { height: number; tasks: Task[] },
) {
  const [draft, setDraft] = useState<{
    source: number;
    side: ConnectionSide;
    x: number;
    y: number;
    target: number | null;
    targetSide: ConnectionSide | null;
    targets?: ReadonlySet<number>;
  } | null>(null);
  const cancel = useRef<(() => void) | null>(null),
    clickGuard = useRef<(() => void) | null>(null);
  const current = useRef({ rows, onLink, onNavigate, navigation, model });
  useLayoutEffect(() => {
    current.current = { rows, onLink, onNavigate, navigation, model };
  });
  useEffect(
    () => () => {
      cancel.current?.();
    },
    [api, enabled, navigationKey],
  );
  useEffect(
    () => () => {
      clickGuard.current?.();
    },
    [api, navigationKey],
  );
  function start(
    event: ReactPointerEvent,
    source: number,
    side: ConnectionSide,
  ) {
    const node = region.current;
    if (
      !enabled ||
      !api ||
      !node ||
      event.button !== 0 ||
      !event.isPrimary ||
      !current.current
        .rows()
        .some((row) => row.task.id === source && row.geometry.connectable)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    cancel.current?.();
    clickGuard.current?.();
    const id = event.pointerId,
      origin = { x: event.clientX, y: event.clientY };
    let point = origin,
      ended = false,
      dragging = false,
      navigated = false,
      frame = 0;
    let tasks = current.current.model?.tasks;
    let allowed = tasks ? ganttConnectionTargets(tasks, source) : undefined;
    const targetAt = () => {
      if (tasks !== current.current.model?.tasks) {
        tasks = current.current.model?.tasks;
        allowed = tasks ? ganttConnectionTargets(tasks, source) : undefined;
      }
      const bounds = node.getBoundingClientRect(),
        state = api.getState();
      const x = point.x - bounds.x,
        y = point.y - bounds.y - (state._scales?.height ?? 56);
      if (
        x < 0 ||
        x > bounds.width ||
        y < 0 ||
        y >= (current.current.model?.height ?? state._chartHeight ?? 0)
      )
        return null;
      const target = ganttConnectionTarget(
        document.elementFromPoint(point.x, point.y),
        current.current.rows(),
        source,
        x,
        y,
        side,
        tasks && allowed ? { tasks, allowed } : undefined,
      );
      return target;
    };
    const draw = () => {
      const bounds = node.getBoundingClientRect(),
        target = targetAt();
      setDraft({
        source,
        side,
        x: point.x - bounds.x,
        y: point.y - bounds.y,
        target: target?.id ?? null,
        targetSide: target?.side ?? null,
        targets: allowed,
      });
    };
    const stop = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", pointerCancel, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", stop);
      node.removeEventListener("lostpointercapture", pointerCancel);
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
      if (dragging) clickGuard.current = suppressGanttClick(id);
      setDraft(null);
      if (cancel.current === stop) cancel.current = null;
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      point = { x: next.clientX, y: next.clientY };
      if (!next.buttons) {
        stop();
        return;
      }
      if (!dragging && Math.hypot(point.x - origin.x, point.y - origin.y) < 6)
        return;
      next.preventDefault();
      dragging = true;
      draw();
    };
    const scroll = () => {
      if (ended) return;
      if (dragging) {
        const bounds = node.getBoundingClientRect(),
          state = api.getState(),
          header = state._scales?.height ?? 56;
        const x = point.x - bounds.x,
          y = point.y - bounds.y - header;
        const dx = x < 30 ? -12 : x > bounds.width - 30 ? 12 : 0;
        const dy =
          y < 28
            ? -10
            : y >
                (current.current.model?.height ?? state._chartHeight ?? 0) - 28
              ? 10
              : 0;
        if (dx || dy) {
          if (!navigated) {
            navigated = true;
            current.current.onNavigate();
          }
          if (dx && current.current.navigation)
            current.current.navigation.scrollBy(dx);
          else if (dx)
            void api.exec("scroll-chart", {
              left: Math.max(0, state.scrollLeft + dx),
            });
          if (dy)
            void api.exec("scroll-chart", {
              top: Math.max(0, state.scrollTop + dy),
            });
        }
        draw();
      }
      frame = requestAnimationFrame(scroll);
    };
    const pointerCancel = (next: PointerEvent) => {
      if (next.pointerId === id) stop();
    };
    const key = (next: KeyboardEvent) => {
      if (next.key === "Escape") {
        next.preventDefault();
        stop();
      }
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== id) return;
      point = { x: next.clientX, y: next.clientY };
      const target = dragging ? targetAt() : null;
      stop();
      if (target)
        current.current.onLink(
          source,
          target.id,
          ((side === "start" ? "S" : "F") +
            (target.side === "start" ? "S" : "F")) as DependencyType,
        );
    };
    node.setPointerCapture(id);
    node.addEventListener("lostpointercapture", pointerCancel);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", pointerCancel, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("blur", stop);
    cancel.current = stop;
    frame = requestAnimationFrame(scroll);
  }
  return { draft, start };
}
