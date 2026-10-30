import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent } from "react";
import { locateTask } from "@svar-ui/react-gantt";
import type { IApi, IGanttTask } from "@svar-ui/react-gantt";
import type { Task } from "../types";
import { useTaskSync } from "../useTaskSync";
import { createGanttCalendarOperations } from "./ganttCalendarOperations";
import { createGanttPointerGesture } from "./ganttPointerGesture";
import type { GanttGestureMode, GanttPreview } from "./ganttPointerGesture";

export function useGanttCalendar(tasks: Task[]) {
  const sync = useTaskSync();
  const syncRevision = useSyncExternalStore(sync.subscribe, sync.getVersion, sync.getVersion);
  const [operations] = useState(() => createGanttCalendarOperations(sync));
  const snapshot = useSyncExternalStore(operations.subscribe, operations.getSnapshot, operations.getSnapshot);
  const [paint, setPaint] = useState(0);
  const [preview, setPreview] = useState<GanttPreview | null>(null);
  const widget = useRef<IApi | null>(null);
  const [gesture] = useState(() => createGanttPointerGesture({
    canStart: operations.canStart,
    commit: operations.commit,
    reset: () => setPaint((value) => value + 1),
    preview: setPreview,
  }));
  useEffect(() => {
    gesture.activate(); operations.activate();
    return () => { gesture.dispose(); operations.dispose(); };
  }, [operations, gesture]);
  const attach = useCallback((api: IApi | null) => { widget.current = api; }, []);
  function onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    const api = widget.current;
    if (!api || !(event.target instanceof Element)) return;
    const surface = event.target.closest("[data-gantt-calendar-task]");
    if (!(surface instanceof HTMLElement)) return;
    const located = locateTask(event.nativeEvent, api);
    const task = tasks.find((item) => item.id === located?.id);
    if (!task || !located || !(located.node instanceof HTMLElement)) return;
    const mode = event.target.closest("[data-gantt-calendar-mode]")?.getAttribute("data-gantt-calendar-mode") ?? "move";
    if (!["move", "start", "end"].includes(mode)) return;
    gesture.start(event.nativeEvent, surface, sync.current(task), api.getTask(task.id) as IGanttTask, api, mode as GanttGestureMode);
  }
  return { operations, snapshot, syncRevision, pending: sync.hasPendingCalendar, revision: operations.getVersion(), paint, preview, gesture, attach, onPointerDownCapture };
}
