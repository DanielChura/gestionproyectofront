import type {
  Task,
  TaskAssignee,
} from "../../../core/interfaces/task.interface";

export function taskAssignees(task: Task): TaskAssignee[] {
  const people = new Map(
    (task.assignees ?? []).map((person) => [person.id, person]),
  );
  if (
    typeof task.responsible_id === "number" &&
    !people.has(task.responsible_id)
  ) {
    people.set(task.responsible_id, {
      id: task.responsible_id,
      name: task.responsible_name ?? "Responsable no disponible",
    });
  }
  return [...people.values()].sort((left, right) => left.id - right.id);
}
