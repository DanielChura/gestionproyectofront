import { getAdder, getUnitStart } from "@svar-ui/gantt-store";
import type { Project, Task } from "../../types";
import { fromGanttWindow, toGanttWindow } from "./ganttCalendar";
import { ganttDay } from "./ganttViewport";
import type { programRange } from "./ganttCalendarSnap";

type Proposal = ReturnType<typeof programRange>;
export function constrainGanttProgramming(
  proposal: Proposal,
  task: Task,
  tasks: Task[],
  project: Pick<Project, "start_date" | "end_date">,
): Proposal | null {
  const window = toGanttWindow({ ...task, ...proposal });
  if (!window.start || !window.end) return null;
  const hourly = Boolean(proposal.schedule);
  const startOf = (row: Task) =>
    row.schedule?.precision === "hour"
      ? new Date(row.schedule.start)
      : ganttDay(row.start_date);
  const parent = tasks.find((row) => row.id === task.parent_id);
  const limits = [
    project.start_date ? ganttDay(project.start_date) : null,
    parent ? startOf(parent) : null,
  ].filter((date): date is Date => date !== null);
  const ends = [
    project.end_date ? getAdder("day")(ganttDay(project.end_date), 1) : null,
    parent ? (toGanttWindow(parent).end ?? null) : null,
  ].filter((date): date is Date => date !== null);
  let minimum = limits.length ? Math.max(...limits.map(Number)) : -Infinity;
  let maximum = ends.length ? Math.min(...ends.map(Number)) : Infinity;
  const children = tasks.filter((row) => row.parent_id === task.id);
  let latestStart = children.length
    ? Math.min(...children.map((row) => Number(startOf(row))))
    : Infinity;
  let earliestEnd = children.length
    ? Math.max(
        ...children.map((row) =>
          Number(
            toGanttWindow(row).end ??
              getAdder(row.schedule?.precision === "hour" ? "hour" : "day")(
                startOf(row),
                1,
              ),
          ),
        ),
      )
    : -Infinity;
  if (!hourly) {
    const floor = (value: number) =>
      Number(getUnitStart("day", new Date(value)));
    const ceil = (value: number) =>
      value === floor(value)
        ? value
        : Number(getAdder("day")(new Date(floor(value)), 1));
    if (Number.isFinite(minimum)) minimum = ceil(minimum);
    if (Number.isFinite(maximum)) maximum = floor(maximum);
    if (Number.isFinite(latestStart)) latestStart = floor(latestStart);
    if (Number.isFinite(earliestEnd)) earliestEnd = ceil(earliestEnd);
  }
  let start = Math.min(Math.max(Number(window.start), minimum), latestStart);
  let end = Math.max(Math.min(Number(window.end), maximum), earliestEnd);
  const unit = hourly ? "hour" : "day";
  if (end < Number(getAdder(unit)(new Date(start), 1))) {
    end = Number(getAdder(unit)(new Date(start), 1));
    if (end > maximum) {
      end = maximum;
      start = Number(getAdder(unit)(new Date(end), -1));
    }
  }
  if (
    start < minimum ||
    start > latestStart ||
    end > maximum ||
    end < earliestEnd ||
    end <= start
  )
    return null;
  const result = fromGanttWindow({
    ...window,
    start: new Date(start),
    end: new Date(end),
  });
  if (hourly && result.schedule)
    return {
      schedule: {
        ...result.schedule,
        precision: "hour",
        end: result.schedule.end!,
      },
    };
  return { start_date: result.start_date, due_date: result.due_date! };
}
