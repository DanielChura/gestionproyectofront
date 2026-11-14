import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorText } from "../../../auth/api";
import { useToast } from "../../../../hooks/useToast";
import {
  changeTaskState,
  getTaskActivity,
  getTaskDetail,
  getTaskSubtasks,
  updateTask,
} from "../../services";
import type {
  Task,
  TaskIdentity,
  TaskPatchPayload,
  TaskStatePayload,
} from "../../types";

export function useTaskDetail(
  target: TaskIdentity,
  onUpdated?: (task: Task) => void,
) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const detailKey = ["task", target.projectId, target.taskId];
  const subtasksKey = ["task-subtasks", target.projectId, target.taskId];
  const activityKey = ["task-activity", target.projectId, target.taskId];

  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => getTaskDetail(target),
  });

  const subtasksQuery = useQuery({
    queryKey: subtasksKey,
    queryFn: () => getTaskSubtasks(target),
  });

  const activityQuery = useQuery({
    queryKey: activityKey,
    queryFn: () => getTaskActivity(target),
  });

  function accept(updated: Task) {
    queryClient.setQueryData(
      detailKey,
      (prev: { task: Task; parent?: Task } | undefined) =>
        prev ? { ...prev, task: updated } : undefined,
    );
    queryClient.invalidateQueries({ queryKey: activityKey });
    onUpdated?.(updated);
  }

  function handleSubtaskCreated(_created: Task) {
    queryClient.invalidateQueries({ queryKey: subtasksKey });
    queryClient.invalidateQueries({ queryKey: activityKey });
    queryClient.invalidateQueries({ queryKey: detailKey });
  }

  function notifyError(title: string, failure: unknown) {
    addToast({
      icon: "error",
      title,
      message: errorText(failure),
    });
  }

  const patchMutation = useMutation({
    mutationFn: (patch: TaskPatchPayload) =>
      updateTask(target.projectId, target.taskId, patch),
    onSuccess: accept,
    onError: (failure) => notifyError("Error al guardar tarea", failure),
  });

  const stateMutation = useMutation({
    mutationFn: (payload: TaskStatePayload) =>
      changeTaskState(target.projectId, target.taskId, payload),
    onSuccess: accept,
    onError: (failure) => notifyError("Error al cambiar estado", failure),
  });

  return {
    task: detailQuery.data?.task,
    parent: detailQuery.data?.parent,
    subtasks: subtasksQuery.data?.items ?? [],
    subtasksSummary: {
      completed: subtasksQuery.data?.completed ?? 0,
      total: subtasksQuery.data?.total ?? 0,
    },
    activities:
      activityQuery.data?.items.flatMap((group) => group.events) ?? [],
    patchTask: patchMutation.mutateAsync,
    onSubtaskCreated: handleSubtaskCreated,
    onPatch: async (_task: Task, patch: TaskPatchPayload) => {
      await patchMutation.mutateAsync(patch);
    },
    onState: async (_task: Task, state: TaskStatePayload) => {
      await stateMutation.mutateAsync(state);
    },
  };
}
