import { useQueryClient } from "@tanstack/react-query";
import TaskDetailController from "../task-detail/TaskDetailController";
import TaskEditDialog from "./TaskEditDialog";
import type { Task } from "../../types";
import type { ReactNode } from "react";
import type { TaskDialogController } from "../../types";
import TaskForm from "./TaskForm";
import DependencyForm from "./DependencyForm";
import TaskStateForm from "./TaskStateForm";

export default function TaskDialog({
  controller,
  feedback,
  gantt = false,
  onUpdated = () => undefined,
}: {
  controller: TaskDialogController;
  feedback?: ReactNode;
  gantt?: boolean;
  onUpdated?: (task: Task) => void;
}) {
  const queryClient = useQueryClient();
  const {
    project,
    tasks,
    catalogs,
    action,
    close,
    saveTask,
    changeState,
    changeDependency,
    configuredStates,
  } = controller;

  if (!action) return null;

  const activeTask =
    action.kind === "create"
      ? undefined
      : tasks.find((task) => task.id === action.taskId);

  if (action.kind !== "create" && !activeTask) return null;

  if (action.kind === "detail")
    return (
      <TaskDetailController
        key={project.id + ":" + action.taskId}
        controller={controller}
        taskId={action.taskId}
        gantt={gantt}
        onUpdated={onUpdated}
      />
    );
  if (action.kind === "edit" && activeTask)
    return (
      <TaskEditDialog
        key={project.id + ":" + activeTask.id}
        controller={controller}
        task={activeTask}
        onUpdated={onUpdated}
        onClose={close}
      />
    );

  if (action.kind === "create" || action.kind === "child")
    return (
      <TaskForm
        key={project.id + ":" + (activeTask?.id ?? "new")}
        project={project}
        catalogs={catalogs}
        task={undefined}
        parent={action.kind === "child" ? activeTask : undefined}
        initialState={action.kind === "create" ? action.stateCode : undefined}
        onSubmit={saveTask}
        onCheckCreation={() =>
          queryClient.refetchQueries({ queryKey: ["tasks", project.id] })
        }
        feedback={feedback}
        onConfigured={configuredStates}
        onClose={close}
      />
    );

  if (action.kind === "state" && activeTask)
    return (
      <>
        <TaskStateForm
          task={activeTask}
          states={project.task_states.states}
          onSubmit={(data) => changeState(activeTask, data)}
          onClose={close}
        />
        {feedback}
      </>
    );

  if (activeTask)
    return (
      <>
        <DependencyForm
          task={activeTask}
          tasks={tasks}
          onChange={changeDependency}
          onClose={close}
        />
        {feedback}
      </>
    );

  return null;
}
