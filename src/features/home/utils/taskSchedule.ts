import type { Task, TaskSchedule } from "../types";

export const dependencyTypes = {
  FS: "FS · Fin → Inicio",
  SS: "SS · Inicio → Inicio",
  FF: "FF · Fin → Fin",
  SF: "SF · Inicio → Fin",
} as const;

export function scheduleInput(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(value))
    .replace(" ", "T");
}
export function hourSchedule(start: string, end: string): TaskSchedule {
  const instant = (input: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
    if (!match) throw new Error("Indica una fecha y hora válidas.");
    const values = match.slice(1).map(Number);
    const civil = Date.UTC(
      values[0],
      values[1] - 1,
      values[2],
      values[3],
      values[4],
    );
    let result = civil;
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 4; attempt++) {
      const parts = Object.fromEntries(
        formatter
          .formatToParts(new Date(result))
          .map((part) => [part.type, part.value]),
      );
      const shown = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      );
      result += civil - shown;
    }
    const iso = new Date(result).toISOString();
    if (scheduleInput(iso) !== input)
      throw new Error(
        "Esta hora no existe en America/Lima; selecciona otra hora válida.",
      );
    return iso;
  };
  return {
    precision: "hour",
    start: instant(start),
    end: end ? instant(end) : null,
    timezone: "America/Lima",
  };
}
export function scheduleLabel(task: Pick<Task, "schedule">) {
  if (task.schedule?.precision !== "hour") return "Día completo";
  return `${scheduleInput(task.schedule.start).replace("T", " ")} — ${task.schedule.end ? scheduleInput(task.schedule.end).replace("T", " ") : "Sin límite"} · America/Lima`;
}
