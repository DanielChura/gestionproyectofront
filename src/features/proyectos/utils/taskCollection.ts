import type { Task } from "../../../core/interfaces/task.interface";

export function reconcileTasks(
  current: Task[],
  incoming: Task[],
  replace = false,
): Task[] {
  const saved = new Map(incoming.map((task) => [task.id, task]));
  const previous = new Map(current.map((task) => [task.id, task]));
  const latest = (tasks: Task[]) =>
    tasks.reduce(
      (value, task) =>
        task.updated_at && task.updated_at > value ? task.updated_at : value,
      "",
    );
  const stale = Boolean(incoming.length && latest(incoming) < latest(current));
  const revision = stale ? undefined : incoming[0]?.move_revision;
  return [
    ...(replace && !stale ? saved : new Map([...previous, ...saved])).values(),
  ].map((task) => {
    const old = previous.get(task.id);
    const next =
      old?.updated_at && task.updated_at && old.updated_at > task.updated_at
        ? old
        : task;
    return revision && next === task
      ? { ...next, move_revision: revision }
      : next;
  });
}
