import type { Task } from "../../types";
export function hasGanttInterval(
  task: Pick<Task, "start_date" | "due_date"> & Partial<Pick<Task, "schedule">>,
) {
  if (task.schedule?.precision === "hour") {
    const start = Date.parse(task.schedule.start),
      end = task.schedule.end ? Date.parse(task.schedule.end) : NaN;
    return (
      Number.isFinite(start) && Number.isFinite(end) && end - start >= 3600000
    );
  }
  return Boolean(
    task.start_date && task.due_date && task.start_date <= task.due_date,
  );
}
export function missingGanttDates(task: Pick<Task, "start_date" | "due_date">) {
  if (!task.start_date && !task.due_date) return "Definir fechas";
  return !task.start_date
    ? "Falta fecha de inicio"
    : !task.due_date
      ? "Falta fecha límite"
      : "Definir fechas";
}
export function ganttBarGeometry(
  task: Task,
  row: {
    $x?: number;
    $w?: number;
    $y?: number;
  },
  view: {
    scrollLeft: number;
    scrollTop: number;
    width: number;
    height: number;
    cellHeight: number;
  },
  active = false,
) {
  const y = (row.$y ?? -view.cellHeight) + view.cellHeight / 2 - view.scrollTop;
  if (y < 0 || y >= view.height) return null;
  const real = hasGanttInterval(task);
  const positioned =
    real && Number.isFinite(row.$x) && Number.isFinite(row.$w) && row.$w! > 0;
  const left = positioned ? row.$x! - view.scrollLeft : null;
  const right = positioned ? left! + row.$w! : null;
  const eligible = positioned && task.permissions.dependencies;
  const small = Boolean(positioned && row.$w! < 72);
  const expanded = Boolean(
    active && small && left! >= 0 && right! <= view.width,
  );
  const displayWidth = expanded ? Math.min(72, view.width) : (row.$w ?? 0);
  const displayLeft = expanded ? (left! + right! - displayWidth) / 2 : left;
  const displayRight = displayLeft === null ? null : displayLeft + displayWidth;
  const inside = (center: number) =>
    center >= 12 && center <= view.width - 12 ? center : null;
  const startVisible = positioned && left! >= 0 && left! <= view.width;
  const endVisible = positioned && right! >= 0 && right! <= view.width;
  const resizeStart =
    startVisible && (!small || expanded) ? inside(displayLeft! + 12) : null;
  const resizeEnd =
    endVisible && (!small || expanded) ? inside(displayRight! - 12) : null;
  const startConnector =
    eligible && startVisible ? inside(displayLeft! - 12) : null;
  const endConnector =
    eligible && endVisible ? inside(displayRight! + 12) : null;
  const labelSide =
    displayRight !== null &&
    displayRight + 108 > view.width &&
    displayLeft! > 120
      ? ("before" as const)
      : ("after" as const);
  const labelRight = labelSide === "before" ? displayLeft! - 28 : view.width;
  const labelLeft =
    displayRight === null
      ? null
      : labelSide === "before"
        ? Math.max(0, labelRight - 320)
        : displayRight + (endConnector !== null ? 28 : 8);
  return {
    y,
    real,
    left,
    right,
    small,
    expanded,
    displayLeft,
    displayRight,
    outside: positioned
      ? right! <= 0
        ? ("before" as const)
        : left! >= view.width
          ? ("after" as const)
          : null
      : null,
    connectable: Boolean(eligible),
    resizeStart,
    resizeEnd,
    startConnector,
    endConnector,
    labelLeft,
    labelSide,
    labelRight,
  };
}
