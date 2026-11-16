export function taskDragSurface(
  region: HTMLElement,
  target: EventTarget | null,
  x: number,
  y: number,
): HTMLTableRowElement | null {
  if (
    !(target instanceof Element) ||
    !region.contains(target) ||
    target.closest("[popover], [role=menu], [role=dialog], dialog")
  )
    return null;
  const direct = target.closest<HTMLTableRowElement>("tr[data-task-id]");
  if (direct) return direct.dataset.dragEnabled === "true" ? direct : null;
  if (!target.closest("tbody, table") || target.closest("thead")) return null;
  return (
    Array.from(
      region.querySelectorAll<HTMLTableRowElement>(
        'tr[data-task-id][data-drag-enabled="true"]',
      ),
    ).find((row) => {
      const rect = row.getBoundingClientRect();
      return (
        row.getClientRects().length > 0 &&
        x >= rect.left &&
        x < rect.right &&
        y >= rect.top &&
        y < rect.bottom
      );
    }) ?? null
  );
}
