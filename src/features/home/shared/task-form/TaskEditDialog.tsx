import type { Task, TaskDialogController } from "../../types";
import TaskForm from "./TaskForm";
import CalendarEditFeedback from "../CalendarEditFeedback";
import { useTaskEdit } from "./useTaskEdit";

export default function TaskEditDialog({
  controller,
  task,
  onUpdated,
  onClose,
}: {
  controller: TaskDialogController;
  task: Task;
  onUpdated: (task: Task) => void;
  onClose: () => void;
}) {
  const edit = useTaskEdit(task, onUpdated, onClose);
  return (
    <TaskForm
      project={controller.project}
      catalogs={controller.catalogs}
      task={task}
      parent={controller.tasks.find((item) => item.id === task.parent_id)}
      onSubmit={edit.save}
      onClose={onClose}
      onConfigured={controller.configuredStates}
      feedback={<CalendarEditFeedback editor={edit.editor} busy={edit.busy} />}
    />
  );
}