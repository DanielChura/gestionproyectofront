import type { IApi } from "@svar-ui/react-gantt";
import { datePosition, positionDate } from "./ganttGeometry";
import {
  centeredViewport,
  fitTimelineViewport,
  viewportCellWidth,
} from "./ganttViewport";
import type { GanttScale, GanttViewport } from "./ganttViewport";
import { zoomLevel } from "./ganttZoom";
export function createGanttNavigation(initial: Date) {
  let view = centeredViewport(initial),
    api: IApi | null = null,
    width = 1000;
  let active = true,
    internal = false,
    queued = false;
  let zoomAnchor: Date | null = null,
    appliedLeft: number | null = null;
  let detach: (() => void) | null = null;
  let pending: {
    date: Date;
    offset: number;
    view: GanttViewport;
  } | null = { date: initial, offset: width / 2, view };
  const levels: Record<GanttScale, number> = {
    day: 5,
    week: 5,
    month: 5,
    quarter: 5,
    year: 5,
  };
  const listeners = new Set<() => void>();
  const publish = (next: GanttViewport) => {
    view = next;
    for (const listener of listeners) listener();
  };
  const state = () => api?.getState();
  const center = () => {
    const current = state();
    return current?._scales
      ? positionDate(current.scrollLeft + width / 2, current)
      : initial;
  };
  const flush = () => {
    queued = false;
    if (!active || !api || !pending) return;
    const current = api.getState(),
      request = pending;
    if (
      current._scales?.start.getTime() !== request.view.start.getTime() ||
      Math.abs((current.cellWidth ?? 0) - viewportCellWidth(request.view)) >
        0.001
    )
      return;
    pending = null;
    internal = true;
    appliedLeft = datePosition(request.date, current) - request.offset;
    void api.exec("scroll-chart", { left: appliedLeft });
    internal = false;
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(flush);
  };
  const request = (next: GanttViewport, date: Date, offset: number) => {
    if (!active) return;
    pending = { view: next, date, offset };
    publish(next);
    schedule();
  };
  const ensure = () => {
    const current = state();
    if (!active || internal || pending || !current?._scales) return;
    if (
      appliedLeft === null ||
      (current.scrollLeft !== appliedLeft &&
        current.scrollLeft !== Math.round(appliedLeft))
    )
      zoomAnchor = null;
    const margin = Math.min(
      Math.max(width, viewportCellWidth(view) * 4),
      Math.max(0, (current._scales.width - width) / 4),
    );
    if (
      current.scrollLeft > margin &&
      current.scrollLeft + width < current._scales.width - margin
    )
      return;
    const date = center();
    request(
      centeredViewport(date, view.scale, view.zoomLevel, width),
      date,
      width / 2,
    );
  };
  const toDate = (date: Date, offset = width / 2) => {
    if (!active) return;
    zoomAnchor = null;
    const current = state();
    if (!current?._scales) {
      request(
        centeredViewport(date, view.scale, view.zoomLevel, width),
        date,
        offset,
      );
      return;
    }
    const x = datePosition(date, current) - offset;
    if (pending || x < width || x + width * 2 > current._scales.width) {
      const middle = positionDate(x + width / 2, current);
      request(
        centeredViewport(middle, view.scale, view.zoomLevel, width),
        date,
        offset,
      );
    } else {
      void api!.exec("scroll-chart", { left: x });
    }
  };
  const scrollBy = (pixels: number) => {
    const current = state();
    if (current?._scales)
      toDate(positionDate(current.scrollLeft + pixels, current), 0);
  };
  const resize = () => {
    const current = state();
    if (!current?._chartWidth || current._chartWidth === width) return;
    const date = pending?.date ?? center();
    zoomAnchor = null;
    width = current._chartWidth;
    request(
      centeredViewport(date, view.scale, view.zoomLevel, width),
      date,
      width / 2,
    );
  };
  const attach = (next: IApi | null) => {
    detach?.();
    detach = null;
    api = next;
    if (!next || !active) return;
    const tag = Symbol("gm-gantt-navigation");
    next.on("scroll-chart", ensure, { tag });
    next.on("resize-chart", resize, { tag });
    const stop = next.getReactiveState()._scales?.subscribe(schedule);
    detach = () => {
      stop?.();
      next.detach(tag);
    };
    resize();
    schedule();
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => view,
    attach,
    activate: () => {
      active = true;
      attach(api);
    },
    dispose: () => {
      active = false;
      detach?.();
      detach = null;
    },
    toDate,
    scrollBy,
    flush,
    changeScale: (scale: GanttScale) => {
      zoomAnchor = null;
      const date = pending?.date ?? center();
      request(
        centeredViewport(date, scale, levels[scale], width),
        date,
        width / 2,
      );
    },
    zoom: (direction: number) => {
      const next = zoomLevel((view.zoomLevel ?? 5) + direction);
      if (next === view.zoomLevel) return;
      const date = zoomAnchor ?? pending?.date ?? center();
      zoomAnchor = date;
      levels[view.scale] = next;
      request(centeredViewport(date, view.scale, next, width), date, width / 2);
    },
    fit: (first: string, last: string) => {
      zoomAnchor = null;
      const next = fitTimelineViewport(first, last, width);
      const count = next.end.getTime() - next.start.getTime();
      const date = new Date(next.start.getTime() + count / 2);
      levels[next.scale] = next.zoomLevel ?? 5;
      request(next, date, width / 2);
    },
    manual: () => {
      zoomAnchor = null;
      if (view.frame) publish({ ...view, frame: undefined });
    },
  };
}
export type GanttNavigation = ReturnType<typeof createGanttNavigation>;
