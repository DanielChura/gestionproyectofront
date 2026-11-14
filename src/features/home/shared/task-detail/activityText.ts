import { getPriority } from "../../../../shared/priorities";
import type { TaskActivityEvent } from "../../types";
import { formatTaskDate } from "../../utils/taskHierarchy";

const fieldNames: Record<string, string> = {
  name: "el nombre",
  state_code: "el estado",
  responsibles: "los responsables",
  start_date: "la fecha de inicio",
  due_date: "la fecha límite",
  priority: "la prioridad",
  labels: "las etiquetas",
  estimated_minutes: "la duración estimada",
  position: "la posición",
};

function plainValue(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return "sin definir";
  if (Array.isArray(value))
    return value.length ? value.map(plainValue).join(", ") : "sin selección";
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    if (typeof item.name === "string") return item.name;
    if (typeof item.first_names === "string")
      return `${item.first_names} ${item.last_names ?? ""}`.trim();
    if (typeof item.code === "string") return item.code;
    return "dato actualizado";
  }
  return String(value);
}

function displayValue(event: TaskActivityEvent, input: unknown): string {
  if (event.field === "priority")
    return getPriority(typeof input === "number" ? input : null).label;
  if (event.field === "start_date" || event.field === "due_date")
    return typeof input === "string" ? formatTaskDate(input) : "sin definir";
  return plainValue(input);
}

export function activityText(event: TaskActivityEvent): string {
  const data =
    event.new_value && typeof event.new_value === "object"
      ? (event.new_value as Record<string, unknown>)
      : {};

  if (event.action === "created") return "creó esta tarea";
  if (event.action === "changed")
    return `cambió ${fieldNames[event.field] ?? event.field} de ${displayValue(
      event,
      event.old_value,
    )} a ${displayValue(event, event.new_value)}`;
  if (event.action === "child_created")
    return `creó la subtarea ${plainValue(data.name)}`;
  if (event.action.startsWith("dependency_"))
    return `${event.action.endsWith("added") ? "añadió" : "retiró"} la dependencia: ${
      data.direction === "blocks"
        ? "esta tarea bloquea"
        : "esta tarea está bloqueada por"
    } ${plainValue(data.name)}`;
  if (event.action.startsWith("relation_"))
    return `${event.action.endsWith("added") ? "añadió" : "retiró"} la relación ${plainValue(
      data.name,
    )} con ${plainValue(data.target_name)}`;
  return "actualizó la tarea";
}
