import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";

export default function GanttSplitter({ width, available, onResize, onCommit }: {
  width: number; available: number; onResize: (width: number) => void; onCommit: (width: number) => void;
}) {
  const cleanup = useRef<(() => void) | null>(null);
  const maximum = Math.max(220, available - 220);
  const clamp = (value: number) => Math.round(Math.max(220, Math.min(maximum, value)));
  useEffect(() => () => cleanup.current?.(), []);
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault(); cleanup.current?.();
    const node = event.currentTarget, id = event.pointerId, origin = event.clientX;
    let next = width, frame = 0, ended = false;
    const move = (point: globalThis.PointerEvent) => {
      if (point.pointerId !== id) return;
      next = clamp(width + point.clientX - origin);
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => onResize(next));
    };
    const end = () => {
      if (ended) return; ended = true;
      cancelAnimationFrame(frame); onResize(next); onCommit(next);
      node.removeEventListener("pointermove", move); node.removeEventListener("pointerup", end);
      node.removeEventListener("pointercancel", end); node.removeEventListener("lostpointercapture", end);
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
      cleanup.current = null;
    };
    cleanup.current = end;
    node.setPointerCapture(id); node.addEventListener("pointermove", move); node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end); node.addEventListener("lostpointercapture", end);
  }
  return <div role="separator" aria-label="Ancho de la tabla de Gantt" aria-orientation="vertical" tabIndex={0}
    aria-valuemin={220} aria-valuemax={maximum} aria-valuenow={Math.round(width)} className="gm-gantt-splitter" style={{ left: width - 2 }}
    onPointerDown={down} onKeyDown={event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = clamp(event.key === "Home" ? 220 : event.key === "End" ? maximum : width + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 80 : 20));
      onResize(next); onCommit(next);
    }} />;
}
