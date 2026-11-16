import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";

export const ganttColumnChoices = [
  { id: "gmResponsible", label: "Responsable", width: 180 },
  { id: "gmStartDate", label: "Inicio", width: 130 },
  { id: "gmDueDate", label: "Fecha límite", width: 150 },
  { id: "gmStateName", label: "Estado", width: 150 },
] as const;

export function useGanttLayout(api: IApi | null = null) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [preferredWidth, setPreferredWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const node = container.current,
      viewport = canvas.current;
    if (!node || !viewport) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setWidth(Math.round(node.clientWidth));
        setCanvasWidth(Math.round(viewport.clientWidth));
        node.style.setProperty(
          "--gm-gantt-height",
          `${Math.min(
            Math.max(120, window.innerHeight - (viewport.querySelector(".gm-task-gantt") ?? node).getBoundingClientRect().top - 62),
            (api?.getState()._scales?.height ?? 56) + (api?.getState()._tasks.length ?? 0) * (api?.getState().cellHeight ?? 40) + 12,
          )}px`,
        );
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(viewport);
    window.addEventListener("resize", measure);
    const stop = api?.getReactiveState()._tasks.subscribe(measure);
    return () => {
      observer.disconnect();
      stop?.();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, [api]);
  const visible = useMemo(() => chosen ?? new Set(["gmStateName"]), [chosen]);
  const columnsWidth =
    250 +
    ganttColumnChoices.reduce(
      (total, column) => total + (visible.has(column.id) ? column.width : 0),
      0,
    );
  const minWidth = 0;
  const available = Math.max(440, canvasWidth);
  const gridWidth = Math.max(
    220,
    Math.min(preferredWidth ?? columnsWidth, available - 220),
  );
  function toggle(id: string) {
    setChosen((current) => {
      const next = new Set(current ?? visible);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return {
    container,
    canvas,
    visible,
    gridWidth,
    minWidth,
    toggle,
    overlay: width < 1024,
    available,
    setPreferredWidth,
  };
}
