import { useState } from "react";
import type { Task, TaskDialogController, TaskIdentity } from "../../types";
import TaskEditDialog from "../task-form/TaskEditDialog";
import TaskDetailModal from "./TaskDetailModal";
import type { TaskDetailModel } from "./TaskDetailModal";
import { useTaskDetail } from "./useTaskDetail";

export default function TaskDetailController({
  controller,
  taskId,
  onUpdated,
  gantt = false,
}: {
  controller: TaskDialogController;
  taskId: number;
  gantt?: boolean;
  onUpdated: (task: Task) => void;
}) {
  const [target, setTarget] = useState<TaskIdentity>({
    projectId: controller.project.id,
    taskId,
  });
  const detail = useTaskDetail(target, onUpdated, gantt);
  const [editing, setEditing] = useState(false);
  const model: TaskDetailModel = {
    ...detail,
    gantt,
    target,
    project: controller.project,
    catalogs: controller.catalogs,
    onNavigate: setTarget,
    onEdit: () => setEditing(true),
    onClose: controller.close,
  };

  if (editing && detail.task) return <TaskEditDialog controller={controller} task={detail.task} onUpdated={detail.acceptTask} onClose={() => setEditing(false)} />;
  return <TaskDetailModal model={model} />;
}
