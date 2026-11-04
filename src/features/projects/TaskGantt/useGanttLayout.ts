import { useLayoutEffect, useMemo, useRef, useState } from "react";

export const ganttColumnChoices = [
  { id: "gmResponsible", label: "Responsable", width: 180 },
  { id: "gmStartDate", label: "Inicio", width: 130 },
  { id: "gmDueDate", label: "Fecha límite", width: 150 },
  { id: "gmStateName", label: "Estado", width: 130 },
] as const;

export function useGanttLayout() {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  useLayoutEffect(() => {
    const node = container.current, viewport = canvas.current;
    if (!node || !viewport) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setWidth(Math.round(node.clientWidth));
        setCanvasWidth(Math.round(viewport.clientWidth));
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(viewport);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  const narrow = width > 0 && width < 1200;
  const nameOnly = width > 0 && width < 800;
  const visible = useMemo(() => chosen ?? new Set(narrow ? nameOnly ? [] : ["gmStateName"] : ganttColumnChoices.map(column => column.id)), [chosen, narrow, nameOnly]);
  const columnsWidth = 250 + ganttColumnChoices.reduce((total, column) => total + (visible.has(column.id) ? column.width : 0), 0);
  const minWidth = 680;
  const gridWidth = Math.min(columnsWidth, Math.max(220, Math.min(Math.max(minWidth, canvasWidth) - 360, canvasWidth > 0 ? canvasWidth - 100 : columnsWidth)));
  function toggle(id: string) {
    setChosen(current => {
      const next = new Set(current ?? visible);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return { container, canvas, visible, gridWidth, minWidth, toggle, overlay: width < 1024 };
}
