import { useQueryClient } from "@tanstack/react-query";
import TaskDetailController from "../task-detail/TaskDetailController";
import TaskEditDialog from "./TaskEditDialog";
import type { Task } from "../../types";
import type { ReactNode } from "react";
import type { TaskAction, TaskDialogController } from "../../types";
import TaskForm from "./TaskForm";
import DependencyForm from "./DependencyForm";
import TaskStateForm from "./TaskStateForm";
import XIcon from "../../../../shared/icons/XIcon";

function dialogTitle(action: TaskAction, taskName?: string) {
  switch (action.kind) {
    case "create":
      return "Nueva tarea";
    case "child":
      return "Nueva subtarea";
    case "dependencies":
      return `Dependencias de ${taskName ?? ""}`;
    case "state":
      return "Cambiar estado";
    default:
      return "Editar datos de tarea";
  }
}

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
      <div className="bg-modal">
        <dialog
          open
          className="m-0 flex max-h-dvh w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
            <h2 className="m-0 text-sm font-medium">
              {dialogTitle(action, activeTask.name)}
            </h2>
            <button
              type="button"
              className="cursor-pointer rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              onClick={close}
            >
              <XIcon className="size-4" />
            </button>
          </header>
          <TaskStateForm
            task={activeTask}
            states={project.task_states.states}
            onSubmit={(data) => changeState(activeTask, data)}
          />
          {feedback}
        </dialog>
      </div>
    );

  if (activeTask)
    return (
      <div className="bg-modal">
        <dialog
          open
          className="m-0 flex max-h-dvh w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
            <h2 className="m-0 text-sm font-medium">
              {dialogTitle(action, activeTask.name)}
            </h2>
            <button
              type="button"
              className="cursor-pointer rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              onClick={close}
            >
              <XIcon className="size-4" />
            </button>
          </header>
          <DependencyForm
            task={activeTask}
            tasks={tasks}
            onChange={changeDependency}
          />
          {feedback}
        </dialog>
      </div>
    );

  return null;
}
