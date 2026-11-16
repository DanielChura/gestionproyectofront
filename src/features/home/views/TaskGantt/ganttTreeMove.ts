import type { Task } from "../../types";

export function ganttTreeDestination(
  tasks: Task[],
  visible: Set<number>,
  source: Task,
  target: Task,
  edge: "before" | "after" | "inside",
  filtered: boolean,
) {
  if (source.id === target.id || !source.permissions.edit) return null;
  let parent = source.parent_id,
    before: number | null;
  if (edge === "inside") {
    if (
      source.parent_id === null ||
      target.parent_id !== null ||
      !target.permissions.edit ||
      ["done", "closed"].includes(target.state_category ?? "")
    )
      return null;
    parent = target.id;
    before = null;
  } else {
    if ((source.parent_id === null) !== (target.parent_id === null))
      return null;
    if (source.parent_id !== target.parent_id) return null;
    const siblings = tasks.filter(
      (task) => task.parent_id === parent && task.id !== source.id,
    );
    before =
      edge === "before"
        ? target.id
        : (siblings[siblings.findIndex((task) => task.id === target.id) + 1]
            ?.id ?? null);
  }
  if (
    filtered &&
    tasks.some((task) => task.parent_id === parent && !visible.has(task.id))
  )
    return null;
  return { parent, before, receiver: parent ?? undefined };
}
