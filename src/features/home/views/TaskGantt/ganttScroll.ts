import type { IApi } from "@svar-ui/react-gantt";

export function ganttVerticalMetrics(state: ReturnType<IApi["getState"]>, chartHeight: number) {
  const height = Math.max(0, chartHeight - (state._scales?.height ?? 56));
  const maximum = Math.max(0, state._tasks.length * (state.cellHeight ?? 40) - height);
  return { height, maximum, top: Math.max(0, Math.min(maximum, state.scrollTop ?? 0)) };
}

export function bindGanttScroll(api: IApi, root: HTMLElement, changed: (value: ReturnType<typeof ganttVerticalMetrics>) => void) {
  const chart = root.querySelector<HTMLElement>(".wx-chart");
  if (!chart) return;
  const tag = Symbol("gm-gantt-scroll");
  const keyboardRoot = root.closest<HTMLElement>(".gm-gantt-canvas") ?? root;
  const metrics = () => ganttVerticalMetrics(api.getState(), chart.clientHeight);
  const scrollTo = (top: number) => {
    const { maximum } = metrics();
    void api.exec("scroll-chart", { top: Math.max(0, Math.min(maximum, top)) });
  };
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const view = metrics();
      if (api.getState().scrollTop !== view.top) scrollTo(view.top);
      if (Math.abs(chart.scrollTop - view.top) > .5) chart.scrollTop = view.top;
      changed(view);
    });
  };
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.target instanceof Element && event.target.closest("[role=dialog],dialog,[popover],input,textarea,select")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = api.getState(), view = metrics();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? view.height : 1;
    void api.exec("scroll-chart", {
      top: view.top + (event.shiftKey ? 0 : event.deltaY) * unit,
      left: Math.max(0, state.scrollLeft + (event.deltaX || (event.shiftKey ? event.deltaY : 0)) * unit),
    });
  };
  const scroll = () => {
    if (Math.abs(chart.scrollTop - metrics().top) > .5) scrollTo(chart.scrollTop);
  };
  const key = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[role=dialog],[popover]")) return;
    const view = metrics();
    const distances: Record<string, number> = { PageUp: -view.height, PageDown: view.height };
    const distance = distances[event.key];
    if (distance === undefined) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    scrollTo(view.top + distance);
  };
  api.intercept("scroll-chart", (event: { top?: number }) => {
    if (event.top !== undefined) event.top = Math.max(0, Math.min(metrics().maximum, event.top));
  }, { tag });
  api.on("scroll-chart", update, { tag });
  const state = api.getReactiveState();
  const stops = [state._tasks, state._chartHeight, state._scales].map(store => store?.subscribe(update));
  const observer = new ResizeObserver(update);
  observer.observe(chart);
  root.addEventListener("wheel", wheel, { passive: false, capture: true });
  keyboardRoot.addEventListener("keydown", key, true);
  chart.addEventListener("scroll", scroll);
  update();
  return {
    step: (direction: number) => scrollTo(metrics().top + direction * (api.getState().cellHeight ?? 40)),
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stops.forEach(stop => stop?.());
      api.detach(tag);
      root.removeEventListener("wheel", wheel, true);
      keyboardRoot.removeEventListener("keydown", key, true);
      chart.removeEventListener("scroll", scroll);
    },
  };
}
