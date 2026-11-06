import { calcScaleCellDate, getAdder, getDiffer } from "@svar-ui/gantt-store";
import type { IApi, IGanttTask } from "@svar-ui/react-gantt";
import type { Task } from "../types";
import { fromGanttWindow, toGanttWindow } from "./ganttCalendar";
import type { GanttDateChanges } from "./ganttCalendarOperations";

export type GanttGestureMode = "move" | "start" | "end";
export interface GanttPreview {
  id: number;
  name: string;
  start_date: string;
  due_date: string | null;
}
interface Options {
  canStart: (task: Task) => boolean;
  commit: (task: Task, changes: GanttDateChanges) => boolean;
  reset: () => void;
  preview: (preview: GanttPreview | null) => void;
}

export function createGanttPointerGesture(options: Options) {
  const previews = new WeakSet<object>();
  let enabled = true;
  let cancel: (() => void) | null = null,
    reapply: (() => void) | null = null;
  let clearClick: (() => void) | null = null;
  function allowPreview(event: object): boolean {
    return previews.delete(event);
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
    const left = rendered.$x,
      width = rendered.$w;
    const boundary = mode === "end" ? left + width : left;
    const boundaryDate = calcScaleCellDate(boundary, state);
    const window = toGanttWindow(base);
    let active = true,
      started = false,
      pointX = originX,
      lastLeft = left,
      lastWidth = width;
    let proposal = { start_date: base.start_date, due_date: base.due_date };
    const emit = (x: number, w: number) => {
      if (!active || !started) return;
      const message = { id: base.id, left: x, width: w, inProgress: true };
      previews.add(message);
      void api.exec("drag-task", message);
    };
    function remove() {
      if (!active) return;
      active = false;
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
      if (!active || !options.canStart(base)) {
        abort();
        return;
      }
      pointX = x;
      const dx = pointX - originX + api.getState().scrollLeft - scrollLeft;
      if (!started && Math.abs(dx) < 6) return;
      const days = getDiffer("day")(
        calcScaleCellDate(boundary + dx, state),
        boundaryDate,
      );
      const adder = getAdder("day");
      const start = mode === "end" ? window.start! : adder(window.start!, days);
      const end = mode === "start" ? window.end! : adder(window.end!, days);
      let candidate: ReturnType<typeof fromGanttWindow>;
      try {
        candidate = fromGanttWindow({ ...window, start, end });
      } catch {
        return;
      }
      const nextLeft = mode === "end" ? left : left + dx;
      const nextWidth =
        mode === "move" ? width : mode === "start" ? width - dx : width + dx;
      if (nextWidth < width / getDiffer("day")(window.end!, window.start!))
        return;
      const firstPreview = !started;
      if (!started) {
        started = true;
        blockResidualClick(pointerId);
        document.getSelection()?.removeAllRanges();
        node.addEventListener("lostpointercapture", pointerCancel);
        node.setPointerCapture?.(pointerId);
      }
      const changed =
        firstPreview ||
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
        mode === "move"
          ? { start_date: proposal.start_date, due_date: proposal.due_date! }
          : mode === "start"
            ? { start_date: proposal.start_date }
            : { due_date: proposal.due_date! };
      const shouldCommit =
        active &&
        started &&
        (proposal.start_date !== base.start_date ||
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
      if (active && started) emit(lastLeft, lastWidth);
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
    allowPreview,
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
