import type { ConnectionRow } from "./useGanttConnection";

export function applyGanttBarPresentation(
  root: HTMLElement | null,
  rows: ConnectionRow[],
) {
  if (!root) return;
  const byId = new Map(rows.map((row) => [row.task.id, row.geometry]));
  for (const node of root.querySelectorAll<HTMLElement>(
    "[data-gantt-calendar-task]",
  )) {
    const bar = byId.get(Number(node.dataset.ganttCalendarTask));
    const expanded =
      bar?.expanded &&
      bar.displayLeft !== null &&
      bar.displayRight !== null &&
      bar.left !== null;
    node.toggleAttribute("data-gantt-expanded", Boolean(expanded));
    node.style.setProperty(
      "--gm-present-shift",
      expanded ? `${bar.displayLeft! - bar.left!}px` : "0px",
    );
    node.style.setProperty(
      "--gm-present-width",
      expanded ? `${bar.displayRight! - bar.displayLeft!}px` : "100%",
    );
  }
}
