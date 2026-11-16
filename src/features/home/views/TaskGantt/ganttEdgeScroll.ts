import type { IApi } from "@svar-ui/react-gantt";

export function ganttEdgeScroll(
  api: IApi,
  bounds: () => { left: number; right: number },
  point: () => number,
  update: () => void,
  navigate?: (pixels: number) => void,
) {
  let active = true,
    frame = 0,
    previous = "";
  const tick = () => {
    if (!active) return;
    const box = bounds(),
      x = point(),
      state = api.getState();
    const delta = x < box.left + 28 ? -12 : x > box.right - 28 ? 12 : 0;
    if (delta) {
      if (navigate) navigate(delta);
      else
        void api.exec("scroll-chart", {
          left: Math.max(0, state.scrollLeft + delta),
        });
    }
    const current = api.getState(),
      key = `${current.scrollLeft}:${current._scales?.start.getTime()}`;
    if (delta || key !== previous) {
      previous = key;
      update();
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    active = false;
    cancelAnimationFrame(frame);
  };
}
