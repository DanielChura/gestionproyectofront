import { useLayoutEffect, useMemo, useRef, useState } from "react";

export const ganttColumnChoices = [
  { id: "gmResponsible", label: "Responsable", width: 180 },
  { id: "gmStartDate", label: "Inicio", width: 130 },
  { id: "gmDueDate", label: "Fecha límite", width: 150 },
  { id: "gmStateName", label: "Estado", width: 130 },
] as const;

export function useGanttLayout() {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  useLayoutEffect(() => {
    const node = container.current;
    if (!node) return;
    const measure = () => setWidth(Math.round(node.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const narrow = width > 0 && width < 1200;
  const nameOnly = width > 0 && width < 800;
  const visible = useMemo(() => chosen ?? new Set(narrow ? nameOnly ? [] : ["gmStateName"] : ganttColumnChoices.map(column => column.id)), [chosen, narrow, nameOnly]);
  const gridWidth = 250 + ganttColumnChoices.reduce((total, column) => total + (visible.has(column.id) ? column.width : 0), 0);
  const minWidth = Math.max(680, gridWidth + 360);
  function toggle(id: string) {
    setChosen(current => {
      const next = new Set(current ?? visible);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return { container, visible, gridWidth, minWidth, toggle };
}
