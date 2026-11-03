import { useEffect, useRef } from "react";
import type { DragEvent, MouseEvent, PointerEvent, RefObject } from "react";
import type { Task } from "../types";
import type { DropPosition, useTaskMove } from "./useTaskMove";

interface PointerDragOptions {
  movement: ReturnType<typeof useTaskMove>;
  locate: (x: number, y: number, task: Task) => DropPosition | null;
  region: RefObject<HTMLDivElement | null>;
}

export function useTaskPointerDrag({ movement, locate, region }: PointerDragOptions) {
  const latest = useRef({ movement, locate, region });
  const cancel = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { latest.current = { movement, locate, region }; }, [movement, locate, region]);
  useEffect(() => () => {
    cancel.current?.();
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
  }, [region]);

  function onPointerDown(event: PointerEvent<HTMLTableRowElement>, task: Task, enabled: boolean) {
    suppressClick.current = false;
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    cancel.current?.();
    if (!enabled || event.pointerType !== "mouse" || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("[contenteditable]:not([contenteditable=false])")) return;
    const interactive = target.closest("button, input, textarea, select, a, summary");
    if (interactive && (!interactive.matches("button[data-task-drag-surface]") || !event.currentTarget.contains(interactive))) return;

    const pointerId = event.pointerId;
    const origin = { x: event.clientX, y: event.clientY };
    let point = origin, started = false, active = true;
    const scroller = region.current;

    function remove() {
      if (!active) return;
      active = false;
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", pointerCancel, true);
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("blur", abort);
      scroller?.removeEventListener("scroll", scroll);
      cancel.current = null;
    }

    function abort() {
      remove();
      if (started) latest.current.movement.end();
    }

    function scroll() {
      if (active && started) latest.current.movement.over(latest.current.locate(point.x, point.y, task));
    }

    function move(next: globalThis.PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      if (next.buttons === 0) { abort(); return; }
      point = { x: next.clientX, y: next.clientY };
      if (!started && Math.hypot(point.x - origin.x, point.y - origin.y) < 6) return;
      next.preventDefault();
      if (!started) {
        started = true;
        suppressClick.current = true;
        document.getSelection()?.removeAllRanges();
        latest.current.movement.start(task, point.x, point.y);
      }
      latest.current.movement.track(point.x, point.y);
      latest.current.movement.over(latest.current.locate(point.x, point.y, task));
    }

    function up(next: globalThis.PointerEvent) {
      if (!active || next.pointerId !== pointerId) return;
      const current = latest.current;
      const drop = started ? current.locate(next.clientX, next.clientY, task) : null;
      remove();
      if (!started) return;
      current.movement.end();
      clickTimer.current = setTimeout(() => { suppressClick.current = false; }, 0);
      if (drop) current.movement.propose(task, drop.state, drop.before);
    }

    function pointerCancel(next: globalThis.PointerEvent) { if (next.pointerId === pointerId) abort(); }
    function keydown(next: KeyboardEvent) {
      if (next.key !== "Escape") return;
      if (started) { next.preventDefault(); next.stopPropagation(); }
      abort();
    }

    cancel.current = abort;
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", pointerCancel, true);
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("blur", abort);
    scroller?.addEventListener("scroll", scroll);
  }

  function onClickCapture(event: MouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    if (event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return { onPointerDown, onClickCapture, onDragStart: (event: DragEvent) => event.preventDefault() };
}
