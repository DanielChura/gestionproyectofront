import { getAdder, getDiffer, getUnitStart } from "@svar-ui/gantt-store";
import { calendarDateKey } from "../../utils/calendarDate";
import type { Task } from "../../types";
import type { GanttState } from "./ganttGeometry";
import { datePosition, positionDate } from "./ganttGeometry";

export function gestureUnit(_state: GanttState) {
  void _state;
  return "day" as const;
}
export function snapBoundary(
  date: Date,
  _state: GanttState,
  end = false,
): Date {
  void _state;
  const first = getUnitStart("day", date);
  return end ? getAdder("day")(first, 1) : first;
}
export function nearestGanttDayBoundary(x: number, state: GanttState): Date {
  const first = getUnitStart("day", positionDate(x, state)),
    next = getAdder("day")(first, 1);
  return x - datePosition(first, state) <= datePosition(next, state) - x
    ? first
    : next;
}
export function programRange(
  first: number,
  last: number,
  state: GanttState,
  task?: Task,
) {
  const hour =
    task?.schedule?.precision === "hour" || state._scales?.minUnit === "hour";
  const point = positionDate(Math.min(first, last), state),
    through = positionDate(Math.max(first, last), state);
  if (hour) {
    const start = new Date(point),
      end = new Date(through);
    const minute =
      task?.schedule?.precision === "hour"
        ? new Date(task.schedule.start).getMinutes()
        : 0;
    start.setMinutes(minute, 0, 0);
    if (start > point) start.setHours(start.getHours() - 1);
    end.setMinutes(minute, 0, 0);
    if (end < through || end <= start) end.setHours(end.getHours() + 1);
    return {
      schedule: {
        precision: "hour" as const,
        start: start.toISOString(),
        end: end.toISOString(),
        timezone: "America/Lima" as const,
      },
    };
  }
  const start = nearestGanttDayBoundary(Math.min(first, last), state);
  const proposedEnd = nearestGanttDayBoundary(Math.max(first, last), state);
  const end = proposedEnd > start ? proposedEnd : getAdder("day")(start, 1);
  return {
    start_date: calendarDateKey(start),
    due_date: calendarDateKey(getAdder("day")(end, -1)),
  };
}
export function gestureWindow(
  start: Date,
  end: Date,
  boundary: number,
  delta: number,
  state: GanttState,
  mode: "move" | "start" | "end",
  precision: "day" | "hour" = "day",
) {
  if (precision === "hour") {
    const minutes =
      Math.round(
        (positionDate(boundary + delta, state).getTime() -
          (mode === "end" ? end : start).getTime()) /
          3600000,
      ) * 60;
    const shifted = (date: Date) => new Date(date.getTime() + minutes * 60000);
    const proposal =
      mode === "move"
        ? { start: shifted(start), end: shifted(end) }
        : mode === "start"
          ? { start: shifted(start), end }
          : { start, end: shifted(end) };
    return proposal.end.getTime() - proposal.start.getTime() >= 3600000
      ? proposal
      : null;
  }
  const origin = mode === "end" ? end : start;
  const days = Math.round(
    getDiffer("day")(
      nearestGanttDayBoundary(boundary + delta, state),
      getUnitStart("day", origin),
    ),
  );
  const shifted = (date: Date) => getAdder("day")(date, days);
  const proposal =
    mode === "move"
      ? { start: shifted(start), end: shifted(end) }
      : mode === "start"
        ? { start: shifted(start), end }
        : { start, end: shifted(end) };
  return proposal.start < proposal.end ? proposal : null;
}
