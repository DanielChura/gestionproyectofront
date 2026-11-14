import { useQuery } from "@tanstack/react-query";
import type { Task } from "../../../../core/interfaces/task.interface";
import { getTasks } from "../../../../core/services/taskService";
import { useAuth } from "../../../../hooks/useAuth";
import { taskAssignees } from "../../../home/utils/taskAssignees";

export type PriorityTask = Task & { projectId: number };

export function usePriorityTasks(projectId: number | null) {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => (projectId === null ? [] : getTasks(projectId)),
    enabled: projectId !== null,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const tasks =
    user && projectId !== null
      ? data
          .filter(
            (task) =>
              task.priority != null &&
              taskAssignees(task).some((person) => person.id === user.id),
          )
          .sort(
            (a, b) =>
              (a.priority ?? 0) - (b.priority ?? 0) ||
              a.name.localeCompare(b.name),
          )
          .map((task) => ({ ...task, projectId }))
      : [];

  return { tasks, isLoading };
}
