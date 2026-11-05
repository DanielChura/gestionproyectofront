import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "../../../core/interfaces/task.interface";
import { getTasks } from "../../../core/services/taskService";
import { errorText } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";
import { reconcileTasks } from "../utils/taskCollection";

export function useProjectTasks(projectId: number) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      try {
        return await getTasks(projectId);
      } catch (err) {
        addToast({
          icon: "error",
          title: "Error al cargar tareas",
          message: errorText(err),
        });
        throw err;
      }
    },
    enabled: Number.isSafeInteger(projectId) && projectId > 0,
    staleTime: 1000 * 60 * 5,
  });

  const setTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => {
      queryClient.setQueryData<Task[]>(["tasks", projectId], (old = []) => {
        return typeof updater === "function" ? updater(old) : updater;
      });
    },
    [queryClient, projectId],
  );

  const acceptTask = useCallback(
    (saved: Task) => {
      setTasks((current) => reconcileTasks(current, [saved]));
    },
    [setTasks],
  );

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }, [queryClient, projectId]);

  return {
    tasks,
    setTasks,
    refetch,
    acceptTask,
  };
}
