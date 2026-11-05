import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  EditTaskPayload,
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskAction,
  TaskFormPayload,
  TaskStatePayload,
} from "../../../core/interfaces/task.interface";
import { reconcileTasks } from "../utils/taskCollection";
import { useProjectCatalogs } from "./useProjectCatalogs";
import { useProjectTasks } from "./useProjectTasks";
import { useTaskMutations } from "./useTaskMutations";

export function useTaskView(
  project: Project,
  onProjectChange: Dispatch<SetStateAction<Project | null>>,
  initialCreate?: number,
  onCreateHandled?: () => void,
) {
  const { tasks, setTasks, refetch, acceptTask } = useProjectTasks(project.id);
  const { catalogs } = useProjectCatalogs();
  const [action, setAction] = useState<TaskAction | null>(() =>
    initialCreate !== undefined && project.permissions.create_tasks
      ? { kind: "create" }
      : null,
  );
  const [configuringStates, setConfiguringStates] = useState(false);

  const replaceTasks = useCallback(
    (next: Task[]) => {
      setTasks((current) => reconcileTasks(current, next, true));
    },
    [setTasks],
  );

  const {
    busy,
    saveTask: executeSaveTask,
    changeState: executeChangeState,
    patchTask: executePatchTask,
    changeDependency: executeChangeDependency,
  } = useTaskMutations({
    projectId: project.id,
    onTaskSaved: acceptTask,
    onTasksReplaced: replaceTasks,
  });

  const saveTask = useCallback(
    async (data: TaskFormPayload) => {
      if (!action) return;
      const activeTask =
        action.kind !== "create"
          ? tasks.find((task) => task.id === action.taskId)
          : undefined;
      await executeSaveTask(
        data,
        action.kind as "create" | "edit" | "child",
        activeTask?.id,
      );
      setAction(null);
    },
    [action, tasks, executeSaveTask],
  );

  const patchTask = useCallback(
    async (task: Task, data: Partial<EditTaskPayload>) => {
      await executePatchTask(task, data);
    },
    [executePatchTask],
  );

  const changeState = useCallback(
    async (task: Task, payload: TaskStatePayload) => {
      await executeChangeState(task, payload);
      setAction(null);
    },
    [executeChangeState],
  );

  const changeDependency = useCallback(
    async (predecessorId: number, remove: boolean) => {
      if (!action || action.kind !== "dependencies") return;
      await executeChangeDependency(action.taskId, predecessorId, remove);
      setTasks((current) =>
        current.map((task) =>
          task.id === action.taskId
            ? {
                ...task,
                dependencies: remove
                  ? task.dependencies.filter((item) => item !== predecessorId)
                  : [...task.dependencies, predecessorId],
              }
            : task,
        ),
      );
    },
    [action, executeChangeDependency, setTasks],
  );

  const configuredStates = useCallback(
    (configuration: ProjectTaskConfiguration) => {
      const { tasks: confirmed, ...flow } = configuration;
      onProjectChange((current) =>
        current ? { ...current, task_states: flow } : current,
      );
      if (confirmed) setTasks(confirmed);
      else void refetch();
    },
    [onProjectChange, setTasks, refetch],
  );

  useEffect(() => {
    if (initialCreate !== undefined) onCreateHandled?.();
  }, [initialCreate, onCreateHandled]);

  return {
    tasks,
    catalogs,
    action,
    setAction,
    busy,
    replaceTasks,
    acceptTask,
    patchTask,
    saveTask,
    changeState,
    changeDependency,
    configuringStates,
    setConfiguringStates,
    configuredStates,
  };
}
