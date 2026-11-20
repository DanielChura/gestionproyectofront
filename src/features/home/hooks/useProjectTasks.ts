import { projectTaskQuery } from "./projectTaskQuery";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "../../../core/interfaces/task.interface";
import { errorText } from "../../../core/api/httpClient";
import { useToast } from "../../../hooks/useToast";
import { reconcileTasks } from "../utils/taskCollection";

export function useProjectTasks(projectId: number) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const {
    data: tasks = [],
    isFetching,
    error,
  } = useQuery(
    projectTaskQuery(projectId, queryClient, (error) => {
      addToast({
        icon: "error",
        title: "Error al cargar tareas",
        message: errorText(error),
      });
    }),
  );

  const setTasks = useCallback(
    (updater: Task[] | ((current: Task[]) => Task[])) => {
      void queryClient.invalidateQueries({
        queryKey: ["projectCharts", projectId],
      });
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
    loading: isFetching,
    error: error ? errorText(error) : "",
    setTasks,
    refetch,
    acceptTask,
  };
}

