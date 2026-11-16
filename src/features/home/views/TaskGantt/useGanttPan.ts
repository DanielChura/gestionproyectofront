import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { GanttNavigation } from "./ganttNavigation";
import { hasGanttInterval } from "./ganttSceneGeometry";
import { positionDate } from "./ganttGeometry";
import { useGanttVerticalScroll } from "./useGanttVerticalScroll";

export function useGanttPan(
  api: IApi | null,
  protectedView: boolean,
  onNavigate: () => void,
  navigation?: GanttNavigation,
) {
  const surface = useRef<HTMLDivElement>(null);
  const captureSurface = useCallback((node: HTMLDivElement | null) => {
    surface.current = node;
  }, []);
  const cleanup = useRef<(() => void) | null>(null);
  const clickCleanup = useRef<(() => void) | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(
    () => () => {
      cleanup.current?.();
      clickCleanup.current?.();
    },
    [api, protectedView],
  );
  const vertical = useGanttVerticalScroll(api, surface);
  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !api ||
      event.shiftKey ||
      event.button !== 0 ||
      !event.isPrimary ||
      (event.target instanceof Element &&
        event.target.closest(
          "[popover], [role=dialog], input, textarea, select, [contenteditable=true]",
        ))
    )
      return false;
    if (!protectedView && event.target instanceof Element && event.target.closest(".wx-bar,button,.gm-gantt-links,[data-link-source]")) return false;
    const state = api.getState(),
      bounds = event.currentTarget.getBoundingClientRect();
    const chartLeft = event.currentTarget.querySelector(".wx-chart")?.getBoundingClientRect().left ?? bounds.left + state.gridWidth + 4;
    if (
      event.clientX < chartLeft ||
      event.clientY >= bounds.bottom - (state._scrollSize ?? 10)
    )
      return false;
    if (!protectedView && !event.altKey) {
      const index = Math.floor((event.clientY - bounds.top - (state._scales?.height ?? 56) + state.scrollTop) / (state.cellHeight ?? 40));
      const row = state._tasks[index];
      if (row?.gmEditable && !hasGanttInterval({ start_date: row.gmStartDate, due_date: row.gmDueDate, schedule: row.gmSchedule })) return false;
    }
    cleanup.current?.();
    clickCleanup.current?.();
    const node = event.currentTarget,
      id = event.pointerId,
      origin = event.clientX,
      left = state.scrollLeft;
    const anchor = navigation ? positionDate(left + origin - chartLeft, state) : null;
    let moved = false,
      ended = false;
    const clearClick = () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", clearClick, true);
      if (clickCleanup.current === clearClick) clickCleanup.current = null;
    };
    const block = (next: MouseEvent) => {
      if (next.detail === 0 || ("pointerId" in next && next.pointerId !== id))
        return;
      next.preventDefault();
      next.stopImmediatePropagation();
      clearClick();
    };
    const stop = () => {
      if (ended) return;
      ended = true;
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", stop);
      node.removeEventListener("lostpointercapture", up);
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
      if (moved) setDragging(false);
      if (cleanup.current === stop) cleanup.current = null;
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId === id) stop();
    };
    const key = (next: KeyboardEvent) => {
      if (next.key === "Escape") {
        if (moved) next.preventDefault();
        stop();
      }
    };
    const move = (next: PointerEvent) => {
      if (ended || next.pointerId !== id) return;
      if (!next.buttons) {
        stop();
        return;
      }
      const delta = next.clientX - origin;
      if (!moved && Math.abs(delta) < 6) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        onNavigate();
        document.getSelection()?.removeAllRanges();
        document.addEventListener("click", block, true);
        document.addEventListener("pointerdown", clearClick, true);
        clickCleanup.current = clearClick;
        node.addEventListener("lostpointercapture", up);
        node.setPointerCapture(id);
      }
      next.preventDefault();
      next.stopPropagation();
      if (anchor && navigation) {
        const current = node.getBoundingClientRect();
        const left = node.querySelector(".wx-chart")?.getBoundingClientRect().left ?? current.left + api.getState().gridWidth + 4;
        navigation.toDate(anchor, next.clientX - left);
      } else void api.exec("scroll-chart", { left: Math.max(0, left - delta) });
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("blur", stop);
    cleanup.current = stop;
    event.stopPropagation();
    return true;
  }
  return { down, dragging, captureSurface, vertical };
}
