import { useLayoutEffect } from "react";
import type { RefObject } from "react";

export function useQuickTaskAlignment(
  form: RefObject<HTMLFormElement | null>,
  probe: RefObject<HTMLSpanElement | null>,
) {
  useLayoutEffect(() => {
    const element = form.current;
    const table = element?.parentElement?.querySelector("table");
    const region = element?.closest('[role="region"]');
    if (!element || !table || !region) return;
    let frame = 0;
    let observed: Element | undefined;
    const observer = new ResizeObserver(schedule);

    function place() {
      if (!element || !table || !region) return;
      const cells = table.querySelectorAll(
        "tbody tr[data-task-id] td:last-child [data-state]",
      );
      const badge = cells[cells.length - 1];
      if (badge !== observed) {
        if (observed) observer.unobserve(observed);
        if (badge) observer.observe(badge);
        observed = badge;
      }
      const bounds = element.getBoundingClientRect();
      if (bounds.width < 576) {
        element.style.removeProperty("--quick-task-end-space");
        return;
      }
      const heading = table.querySelector("th:last-child");
      if (!heading) return;
      const padding = getComputedStyle(heading);
      const column = heading.getBoundingClientRect();
      const contentWidth =
        column.width -
        parseFloat(padding.paddingLeft) -
        parseFloat(padding.paddingRight);
      const target =
        badge?.getBoundingClientRect().right ??
        column.left +
          parseFloat(padding.paddingLeft) +
          Math.min(
            probe.current?.getBoundingClientRect().width ?? contentWidth,
            contentWidth,
          );
      if (target > bounds.right + 1 || target <= bounds.left) {
        element.style.removeProperty("--quick-task-end-space");
        return;
      }
      element.style.setProperty(
        "--quick-task-end-space",
        `${Math.max(0, bounds.right - target)}px`,
      );
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    }

    observer.observe(table);
    observer.observe(region);
    if (probe.current) observer.observe(probe.current);
    const changes = new MutationObserver(schedule);
    changes.observe(table, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    region.addEventListener("scroll", schedule, { passive: true });
    place();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      changes.disconnect();
      region.removeEventListener("scroll", schedule);
    };
  }, [form, probe]);
}

