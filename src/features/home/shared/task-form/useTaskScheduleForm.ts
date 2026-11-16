import { useState } from "react";
import type { Task, TaskSchedule } from "../../types";
import { hourSchedule, scheduleInput } from "../../utils/taskSchedule";

export function useTaskScheduleForm(task?: Task) {
  const [precision, setPrecision] = useState<"day" | "hour">(
    () => task?.schedule?.precision ?? "day",
  );
  const [start, setStart] = useState(() =>
    task?.schedule?.precision === "hour"
      ? scheduleInput(task.schedule.start)
      : "",
  );
  const [end, setEnd] = useState(() =>
    task?.schedule?.precision === "hour" && task.schedule.end
      ? scheduleInput(task.schedule.end)
      : "",
  );
  function value(first: string, last: string): TaskSchedule | undefined {
    if (precision === "hour") {
      if (!start) throw new Error("Indica el inicio horario en America/Lima.");
      const schedule = hourSchedule(start, end);
      if (
        schedule.end &&
        new Date(schedule.end).getTime() - new Date(schedule.start).getTime() <
          3600000
      )
        throw new Error(
          "El intervalo mínimo es una hora; el límite horario es exclusivo.",
        );
      return schedule;
    }
    if (task?.schedule?.precision === "hour")
      return {
        precision: "day",
        start: first,
        end: last || null,
        timezone: "America/Lima",
      };
    return undefined;
  }
  return { precision, setPrecision, start, setStart, end, setEnd, value };
}
