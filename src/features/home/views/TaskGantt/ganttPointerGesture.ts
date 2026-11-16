import { datePosition, positionDate } from "./ganttGeometry";
import { ganttEdgeScroll } from "./ganttEdgeScroll";
import { gestureWindow } from "./ganttCalendarSnap";
import type { IApi, IGanttTask } from "@svar-ui/react-gantt";
import type { Task } from "../../types";
import { fromGanttWindow, toGanttWindow } from "./ganttCalendar";
import type { GanttDateChanges } from "./ganttCalendarOperations";

export type GanttGestureMode = "move" | "start" | "end";
export interface GanttPreview {
  id: number;
  name: string;
  start_date: string;
  due_date: string | null;
  schedule?: Task["schedule"];
}
interface Options {
  canStart: (task: Task) => boolean;
  commit: (task: Task, changes: GanttDateChanges) => boolean;
  reset: () => void;
  preview: (preview: GanttPreview | null) => void;
}

export function createGanttPointerGesture(options: Options) {
  const previews = new WeakSet<object>(),
    layouts = new WeakSet<object>();
  let activeId: number | null = null;
  let enabled = true;
  let writable = true;
  let navigate: ((pixels: number) => void) | undefined;
  let cancel: (() => void) | null = null,
    reapply: (() => void) | null = null;
  let clearClick: (() => void) | null = null;
  function allowPreview(event: object): boolean {
    return layouts.delete(event) || (writable && previews.delete(event));
  }
  function blockResidualClick(pointerId: number) {
    clearClick?.();
    const clear = () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", clear, true);
      window.removeEventListener("blur", clear);
      if (clearClick === clear) clearClick = null;
    };
    const block = (event: MouseEvent) => {
      if (
        clearClick !== clear ||
        event.detail === 0 ||
        ("pointerId" in event && event.pointerId !== pointerId)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clear();
    };
    clearClick = clear;
    document.addEventListener("click", block, true);
    document.addEventListener("pointerdown", clear, true);
    window.addEventListener("blur", clear);
  }
  function start(
    event: PointerEvent,
    node: HTMLElement,
    task: Task,
    rendered: IGanttTask,
    api: IApi,
    mode: GanttGestureMode,
  ) {
    if (
      !enabled ||
      !writable ||
      event.button !== 0 ||
      !event.isPrimary ||
      !["mouse", "pen"].includes(event.pointerType) ||
      !options.canStart(task) ||
      task.due_date === null ||
      !Number.isFinite(rendered.$x) ||
      !Number.isFinite(rendered.$w)
    )
      return false;
    clearClick?.();
    cancel?.();
    const pointerId = event.pointerId,
      originX = event.clientX;
    const base = { ...task },
      state = api.getState(),
      scrollLeft = state.scrollLeft;
    const originalLeft = positionDate(scrollLeft, state);
    const left = rendered.$x,
      width = rendered.$w;
    const window = toGanttWindow(base);
    let active = true,
      started = false,
      pointX = originX,
      lastLeft = left,
      lastWidth = width;
    let stopScroll: (() => void) | undefined;
    let proposal: ReturnType<typeof fromGanttWindow> = {
      start_date: base.start_date,
      due_date: base.due_date,
      ...(base.schedule ? { schedule: base.schedule } : {}),
    };
    const emit = (x: number, w: number) => {
      if (!active || !started) return;
      const message = { id: base.id, left: x, width: w, inProgress: true };
      previews.add(message);
      void api.exec("drag-task", message);
    };
    function remove() {
      if (!active) return;
      active = false;
      if (activeId === base.id) activeId = null;
      stopScroll?.();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", pointerCancel, true);
      document.removeEventListener("keydown", keydown, true);
      globalThis.window.removeEventListener("blur", blur);
      node.removeEventListener("lostpointercapture", pointerCancel);
      if (node.hasPointerCapture?.(pointerId))
        node.releasePointerCapture(pointerId);
      if (cancel === abort) {
        cancel = null;
        reapply = null;
      }
    }
    function abort() {
      if (!active) return;
      remove();
      if (started && enabled) {
        options.preview(null);
        options.reset();
      }
    }
    function update(x: number) {
      if (!active || !writable || !options.canStart(base)) {
        abort();
        return;
      }
      pointX = x;
      const current = api.getState();
      const dx =
        pointX -
        originX +
        current.scrollLeft -
        datePosition(originalLeft, current);
      const boundary = datePosition(
        mode === "end" ? window.end! : window.start!,
        current,
      );
      if (!started && Math.abs(dx) < 6) return;
      const dates = gestureWindow(
        window.start!,
        window.end!,
        boundary,
        dx,
        current,
        mode,
        base.schedule?.precision,
      );
      if (!dates) return;
      let candidate: ReturnType<typeof fromGanttWindow>;
      try {
        candidate = fromGanttWindow({ ...window, ...dates });
      } catch {
        return;
      }
      const nextLeft = datePosition(dates.start, current);
      const nextWidth = datePosition(dates.end, current) - nextLeft;
      const firstPreview = !started;
      if (!started) {
        started = true;
        activeId = base.id;
        blockResidualClick(pointerId);
        document.getSelection()?.removeAllRanges();
        node.addEventListener("lostpointercapture", pointerCancel);
        node.setPointerCapture?.(pointerId);
        const chart =
          node.closest?.(".wx-chart") ??
          node.closest?.(".gm-task-gantt")?.querySelector(".wx-chart");
        if (chart)
          stopScroll = ganttEdgeScroll(
            api,
            () => chart.getBoundingClientRect(),
            () => pointX,
            () => update(pointX),
            navigate,
          );
      }
      const changed =
        firstPreview ||
        JSON.stringify(proposal.schedule) !==
          JSON.stringify(candidate.schedule) ||
        proposal.start_date !== candidate.start_date ||
        proposal.due_date !== candidate.due_date;
      proposal = candidate;
      lastLeft = nextLeft;
      lastWidth = nextWidth;
      emit(lastLeft, lastWidth);
      if (changed)
        options.preview({ id: base.id, name: base.name, ...proposal });
    }
    function move(next: PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      if (next.buttons === 0) {
        abort();
        return;
      }
      next.preventDefault();
      update(next.clientX);
    }
    function up(next: PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      update(next.clientX);
      if (!active) return;
      const changes: GanttDateChanges =
        proposal.schedule?.precision === "hour"
          ? { schedule: proposal.schedule }
          : mode === "move"
            ? { start_date: proposal.start_date, due_date: proposal.due_date! }
            : mode === "start"
              ? { start_date: proposal.start_date }
              : { due_date: proposal.due_date! };
      const shouldCommit =
        active &&
        started &&
        ((base.schedule?.precision === "hour" &&
          JSON.stringify(proposal.schedule) !==
            JSON.stringify(base.schedule)) ||
          proposal.start_date !== base.start_date ||
          proposal.due_date !== base.due_date);
      remove();
      if (started && enabled) {
        options.preview(null);
        options.reset();
      }
      if (shouldCommit) options.commit(base, changes);
    }
    function pointerCancel(next: PointerEvent) {
      if (next.pointerId === pointerId) abort();
    }
    function keydown(next: KeyboardEvent) {
      if (next.key !== "Escape") return;
      if (started) {
        next.preventDefault();
        next.stopPropagation();
      }
      abort();
    }
    function blur(next: FocusEvent) {
      if (next.target === globalThis.window) abort();
    }
    cancel = abort;
    reapply = () => {
      if (active && started) update(pointX);
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", pointerCancel, true);
    document.addEventListener("keydown", keydown, true);
    globalThis.window.addEventListener("blur", blur);
    return true;
  }
  return {
    start,
    dragging: (id: number) => activeId === id,
    layout: (api: IApi, id: number, left: number, width: number) => {
      if (!enabled) return;
      const message = { id, left, width, inProgress: true };
      layouts.add(message);
      void api.exec("drag-task", message);
    },
    setNavigation: (next: (pixels: number) => void) => {
      navigate = next;
    },
    allowPreview,
    setWritable: (value: boolean) => {
      writable = value;
      if (!value) cancel?.();
    },
    activate: () => {
      enabled = true;
    },
    cancel: () => cancel?.(),
    refresh: () => reapply?.(),
    dispose: () => {
      enabled = false;
      cancel?.();
      clearClick?.();
    },
  };
}
