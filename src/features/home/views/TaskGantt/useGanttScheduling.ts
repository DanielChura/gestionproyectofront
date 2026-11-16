import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { constrainGanttProgramming } from "./ganttProgrammingBounds";
import type { Task, Project } from "../../types";
import type { useGanttCalendar } from "./useGanttCalendar";
import type { GanttUnit } from "./ganttViewport";
import type { GanttNavigation } from "./ganttNavigation";
import { hasGanttInterval } from "./ganttSceneGeometry";
import { startGanttProgramming } from "./ganttProgrammingGesture";
import type { ProgrammingPreview } from "./ganttProgrammingGesture";

interface Model {
  api: IApi | null;
  project: Project;
  height: number;
  tasks: Task[];
  unit: GanttUnit;
  enabled: boolean;
  navigationKey: string;
  canCreate: boolean;
  calendar: ReturnType<typeof useGanttCalendar>;
  navigation: GanttNavigation;
  onDates: (
    task: Task,
    initial?: { start_date: string; due_date: string },
  ) => void;
  onCreateAt: (start: string) => void;
}
export function useGanttScheduling(
  region: RefObject<HTMLDivElement | null>,
  model: Model,
) {
  const latest = useRef(model);
  const [preview, setPreview] = useState<ProgrammingPreview | null>(null);
  useEffect(() => {
    latest.current = model;
  });
  useEffect(() => {
    const api = model.api,
      node = region.current,
      host = node?.parentElement;
    if (!api || !node || !host || !model.enabled) return;
    let cancel: (() => void) | undefined, clearClick: (() => void) | undefined;
    const eligible = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.altKey ||
        event.target.closest(
          "button,input,[role=button],.wx-bar,.gm-gantt-exterior,.gm-gantt-links",
        )
      )
        return null;
      const state = api.getState(),
        box = node.getBoundingClientRect(),
        header = state._scales?.height ?? 56;
      const x = event.clientX - box.left,
        y = event.clientY - box.top - header;
      if (x < 0 || x >= box.width || y < 0 || y >= latest.current.height)
        return null;
      const index = Math.floor(
        (y + state.scrollTop) / (state.cellHeight ?? 40),
      );
      const task = latest.current.tasks.find(
        (item) => item.id === Number(state._tasks[index]?.id),
      );
      return task &&
        !hasGanttInterval(task) &&
        latest.current.calendar.operations.canStart(task)
        ? {
            task,
            index,
            x,
            y:
              header +
              (index + 0.5) * (state.cellHeight ?? 40) -
              state.scrollTop,
          }
        : null;
    };
    const hover = (event: PointerEvent) => {
      if (cancel) return;
      const at = eligible(event);
      setPreview(at ? { id: at.task.id, x: at.x, y: at.y } : null);
    };
    const down = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        !["mouse", "pen"].includes(event.pointerType)
      )
        return;
      const at = eligible(event);
      if (!at) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cancel?.();
      clearClick?.();
      const task = latest.current.calendar.captureTask(at.task);
      cancel = startGanttProgramming(event, {
        constrain: (proposal) =>
          constrainGanttProgramming(
            proposal,
            task,
            latest.current.tasks,
            latest.current.project,
          ),
        api,
        node,
        task,
        canStart: () =>
          latest.current.enabled &&
          latest.current.calendar.operations.canStart(task),
        preview: (value) => {
          if (!value) cancel = undefined;
          setPreview(value);
        },
        commit: (value) => {
          latest.current.calendar.operations.commit(task, value);
        },
        open: () => latest.current.onDates(task),
        navigate: latest.current.navigation.scrollBy,
        suppress: (clear) => {
          clearClick?.();
          clearClick = clear;
        },
      });
    };
    const leave = () => {
      if (!cancel) setPreview(null);
    };
    host.addEventListener("pointermove", hover, true);
    host.addEventListener("pointerdown", down, true);
    host.addEventListener("pointerleave", leave);
    return () => {
      cancel?.();
      clearClick?.();
      setPreview(null);
      host.removeEventListener("pointermove", hover, true);
      host.removeEventListener("pointerdown", down, true);
      host.removeEventListener("pointerleave", leave);
    };
  }, [model.api, model.enabled, model.unit, model.navigationKey, region]);
  return preview;
}
