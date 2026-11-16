import type { IApi } from "@svar-ui/react-gantt";
import type { Task } from "../../types";
import { datePosition, positionDate } from "./ganttGeometry";
import { toGanttWindow } from "./ganttCalendar";
import { programRange } from "./ganttCalendarSnap";
import { ganttEdgeScroll } from "./ganttEdgeScroll";
import { suppressGanttClick } from "./ganttResidualClick";

export type ProgrammingPreview = {
  id: number;
  x: number;
  y: number;
  width?: number;
  proposal?: ReturnType<typeof programRange>;
};
interface Options {
  api: IApi;
  node: HTMLElement;
  task: Task;
  constrain?: (
    proposal: ReturnType<typeof programRange>,
  ) => ReturnType<typeof programRange> | null;
  canStart: () => boolean;
  preview: (value: ProgrammingPreview | null) => void;
  commit: (value: ReturnType<typeof programRange>) => void;
  open: () => void;
  navigate: (pixels: number) => void;
  suppress: (clear: () => void) => void;
}
export function startGanttProgramming(event: PointerEvent, o: Options) {
  const id = event.pointerId,
    origin = event.clientX,
    y = event.clientY;
  const bounds = o.node.getBoundingClientRect(),
    state = o.api.getState();
  const first = positionDate(origin - bounds.left + state.scrollLeft, state);
  let active = true,
    moved = false,
    point = origin,
    stopScroll: (() => void) | undefined;
  let proposal: ReturnType<typeof programRange> | undefined;
  const draw = () => {
    if (!active || !o.canStart()) {
      stop();
      return;
    }
    const current = o.api.getState(),
      box = o.node.getBoundingClientRect();
    const index = current._tasks.findIndex(
      (row) => Number(row.id) === o.task.id,
    );
    if (index < 0) {
      stop();
      return;
    }
    const range = programRange(
      datePosition(first, current),
      point - box.left + current.scrollLeft,
      current,
      o.task,
    );
    const constrained = o.constrain ? o.constrain(range) : range;
    if (!constrained) {
      stop();
      return;
    }
    proposal = constrained;
    const window = toGanttWindow({ ...o.task, ...proposal });
    const x = datePosition(window.start!, current) - current.scrollLeft;
    o.preview({
      id: o.task.id,
      x,
      y:
        (current._scales?.height ?? 56) +
        (index + 0.5) * (current.cellHeight ?? 40) -
        current.scrollTop,
      width: datePosition(window.end!, current) - current.scrollLeft - x,
      proposal,
    });
  };
  const stop = () => {
    if (!active) return;
    active = false;
    stopScroll?.();
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("pointerup", up, true);
    document.removeEventListener("pointercancel", lost, true);
    document.removeEventListener("keydown", key, true);
    window.removeEventListener("blur", stop);
    o.node.removeEventListener("lostpointercapture", lost);
    if (o.node.hasPointerCapture(id)) o.node.releasePointerCapture(id);
    o.preview(null);
  };
  const move = (next: PointerEvent) => {
    if (!active || next.pointerId !== id) return;
    if (!next.buttons) {
      stop();
      return;
    }
    point = next.clientX;
    if (!moved && Math.hypot(point - origin, next.clientY - y) < 6) return;
    if (!moved) {
      moved = true;
      o.suppress(suppressGanttClick(id));
      o.node.setPointerCapture(id);
      document.getSelection()?.removeAllRanges();
      stopScroll = ganttEdgeScroll(
        o.api,
        () => o.node.getBoundingClientRect(),
        () => point,
        draw,
        o.navigate,
      );
    }
    next.preventDefault();
    next.stopImmediatePropagation();
    draw();
  };
  const up = (next: PointerEvent) => {
    if (!active || next.pointerId !== id) return;
    next.preventDefault();
    next.stopImmediatePropagation();
    if (moved) {
      point = next.clientX;
      draw();
    }
    if (!active) return;
    const final = proposal;
    o.suppress(suppressGanttClick(id));
    stop();
    if (moved && final) o.commit(final);
    else o.open();
  };
  const lost = (next: PointerEvent) => {
    if (next.pointerId === id) stop();
  };
  const key = (next: KeyboardEvent) => {
    if (next.key === "Escape") {
      next.preventDefault();
      next.stopImmediatePropagation();
      stop();
    }
  };
  document.addEventListener("pointermove", move, true);
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", lost, true);
  document.addEventListener("keydown", key, true);
  o.node.addEventListener("lostpointercapture", lost);
  window.addEventListener("blur", stop);
  return stop;
}
