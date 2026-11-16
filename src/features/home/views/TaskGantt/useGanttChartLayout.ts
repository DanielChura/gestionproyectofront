import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { IApi } from "@svar-ui/react-gantt";

export function useGanttChartLayout(
  api: IApi | null,
  region: RefObject<HTMLDivElement | null>,
) {
  const [view, setView] = useState<{
    left: number;
    width: number;
    grid: HTMLElement | null;
  }>({ left: 0, width: 0, grid: null });
  useLayoutEffect(() => {
    const root = region.current?.parentElement,
      chart = root?.querySelector<HTMLElement>(".wx-chart");
    if (!api || !root || !chart) return;
    const measure = () => {
      const left =
        chart.getBoundingClientRect().left - root.getBoundingClientRect().left;
      const width = chart.clientWidth;
      const grid = chart.querySelector<HTMLElement>(
        '.wx-area > div[style*="data:image/png"]',
      );
      setView((current) =>
        current.left === left &&
        current.width === width &&
        current.grid === grid
          ? current
          : { left, width, grid },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(chart);
    const tag = Symbol("gm-gantt-chart-layout");
    api.on("render-data", measure, { tag });
    api.on("resize-grid", measure, { tag });
    measure();
    return () => {
      observer.disconnect();
      api.detach(tag);
    };
  }, [api, region]);
  return view;
}
