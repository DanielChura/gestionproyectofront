import type { Project, TaskDialogController } from "../../types";
import type { useTaskView } from "../../hooks/useTaskView";
import { useTaskEdit } from "../../shared/task-form/useTaskEdit";

export function useGanttDialog(
  project: Project,
  view: ReturnType<typeof useTaskView>,
) {
  const action = view.action;
  const task =
    action && action.kind !== "create"
      ? view.tasks.find((item) => item.id === action.taskId)
      : undefined;
  const edit = useTaskEdit(task, view.acceptTask, () => view.setAction(null));
  const controller: TaskDialogController = {
    project,
    ...view,
    busy: view.busy || edit.busy,
    close: () => view.setAction(null),
    saveTask: view.action?.kind === "edit" && task ? edit.save : view.saveTask,
  };
  return { controller, editor: edit.editor, task };
}
