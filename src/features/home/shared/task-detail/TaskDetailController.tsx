import { useState } from "react";
import type { Task, TaskDialogController, TaskIdentity } from "../../types";
import TaskDetailModal from "./TaskDetailModal";
import type { TaskDetailModel } from "./TaskDetailModal";
import { useTaskDetail } from "./useTaskDetail";

export default function TaskDetailController({
  controller,
  taskId,
  onUpdated,
}: {
  controller: TaskDialogController;
  taskId: number;
  onUpdated: (task: Task) => void;
}) {
  const [target, setTarget] = useState<TaskIdentity>({
    projectId: controller.project.id,
    taskId,
  });
  const detail = useTaskDetail(target, onUpdated);
  const model: TaskDetailModel = {
    ...detail,
    target,
    project: controller.project,
    catalogs: controller.catalogs,
    onNavigate: setTarget,
    onClose: controller.close,
  };

  return <TaskDetailModal model={model} />;
}
