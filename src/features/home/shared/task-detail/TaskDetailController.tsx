import { useState } from "react";
import type { Task, TaskDialogController, TaskIdentity } from "../../types";
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
  const model: TaskDetailModel = {
    ...detail,
    gantt,
    target,
    project: controller.project,
    catalogs: controller.catalogs,
    onNavigate: setTarget,
    onClose: controller.close,
  };
  return <TaskDetailModal model={model} />;
}
