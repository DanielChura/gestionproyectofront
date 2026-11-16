import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { PointerEvent } from "react";
import type { IApi, IGanttTask } from "@svar-ui/react-gantt";
import type { Task } from "../../types";
import { useTaskSync } from "../../utils/useTaskSync";
import { createGanttCalendarOperations } from "./ganttCalendarOperations";
import { createGanttPointerGesture } from "./ganttPointerGesture";
import type { GanttGestureMode, GanttPreview } from "./ganttPointerGesture";

export function useGanttCalendar(
  tasks: Task[],
  onConfirmed: (task: Task) => void,
  enabled = true,
) {
  const sync = useTaskSync();
  const syncRevision = useSyncExternalStore(
    sync.subscribe,
    sync.getVersion,
    sync.getVersion,
  );
  const [operations] = useState(() => createGanttCalendarOperations(sync));
  useEffect(() => {
    operations.setOnConfirmed(onConfirmed);
  }, [operations, onConfirmed]);
  const snapshot = useSyncExternalStore(
    operations.subscribe,
    operations.getSnapshot,
    operations.getSnapshot,
  );
  const [paint, setPaint] = useState(0);
  const [preview, setPreview] = useState<GanttPreview | null>(null);
  const widget = useRef<IApi | null>(null);
  const [gesture] = useState(() =>
    createGanttPointerGesture({
      canStart: operations.canStart,
      commit: operations.commit,
      reset: () => setPaint((value) => value + 1),
      preview: setPreview,
    }),
  );
  useLayoutEffect(() => {
    gesture.setWritable(enabled);
  }, [enabled, gesture]);
  useEffect(() => {
    gesture.activate();
    operations.activate();
    return () => {
      gesture.dispose();
      operations.dispose();
    };
  }, [operations, gesture]);
  const attach = useCallback((api: IApi | null) => {
    widget.current = api;
  }, []);
  function onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    const api = widget.current;
    if (!api || !(event.target instanceof Element)) return;
    const surface = event.target.closest(
      "[data-gantt-calendar-task],[data-gantt-edit-task]",
    );
    if (!(surface instanceof HTMLElement)) return;
    const task = tasks.find(
      (item) =>
        item.id ===
        Number(
          surface.dataset.ganttCalendarTask ?? surface.dataset.ganttEditTask,
        ),
    );
    if (!task) return;
    const mode =
      event.target
        .closest("[data-gantt-calendar-mode]")
        ?.getAttribute("data-gantt-calendar-mode") ?? "move";
    if (!["move", "start", "end"].includes(mode)) return;
    gesture.start(
      event.nativeEvent,
      surface,
      sync.current(task),
      api.getTask(task.id) as IGanttTask,
      api,
      mode as GanttGestureMode,
    );
  }
  return {
    operations,
    allowPreview: gesture.allowPreview,
    captureTask: sync.current,
    snapshot,
    syncRevision,
    pending: sync.hasPendingCalendar,
    revision: operations.getVersion(),
    paint,
    preview,
    gesture,
    attach,
    onPointerDownCapture,
  };
}
