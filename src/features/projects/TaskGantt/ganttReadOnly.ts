import type { IApi } from "@svar-ui/react-gantt";

type EventApi = Pick<IApi, "intercept" | "detach">;

export function bindGanttReadOnly(api: EventApi): () => void {
  const tag = Symbol("gm-gantt-readonly");
  const changes = [
    "add-task", "update-task", "delete-task", "drag-task", "copy-task",
    "move-task", "indent-task", "show-editor", "add-link", "update-link",
    "delete-link", "provide-data", "schedule-tasks", "undo", "redo",
    "split-task", "import-data", "sort-tasks", "group-tasks", "add-assignment", "delete-assignment", "update-assignment",
  ] as const;
  for (const action of changes) api.intercept(action, () => false, { tag });
  return () => api.detach(tag);
}
