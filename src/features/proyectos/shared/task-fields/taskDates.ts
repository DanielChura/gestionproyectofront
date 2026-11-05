import { projectToday } from "../../utils/taskGrouping";

export function isPastTaskDate(value?: string | null, now = new Date()) {
  return Boolean(value && value < projectToday(now));
}

export function taskCreationStart(
  projectStart?: string | null,
  parentStart?: string | null,
  now = new Date(),
) {
  return [projectToday(now), projectStart ?? "", parentStart ?? ""]
    .sort()
    .at(-1)!;
}

