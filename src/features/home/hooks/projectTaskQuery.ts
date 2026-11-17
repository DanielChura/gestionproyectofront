import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { Task } from "../../../core/interfaces/task.interface";
import { getTasks } from "../../../core/services/taskService";
import { sessionVersion } from "../../../core/api/httpClient";
import { StaleTaskResponse } from "../utils/useTaskSync";
import { reconcileTasks } from "../utils/taskCollection";

export function projectTaskQuery(
  projectId: number,
  queryClient: QueryClient,
  onError?: (error: unknown) => void,
) {
  return queryOptions({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const epoch = sessionVersion();
      const before = queryClient.getQueryData<Task[]>(["tasks", projectId]);
      try {
        const incoming = await getTasks(projectId);
        if (epoch !== sessionVersion()) throw new StaleTaskResponse();
        const current = queryClient.getQueryData<Task[]>(["tasks", projectId]);
        return reconcileTasks(current ?? [], incoming, current === before);
      } catch (error) {
        if (epoch === sessionVersion()) onError?.(error);
        throw error;
      }
    },
    enabled: Number.isSafeInteger(projectId) && projectId > 0,
    staleTime: 1000 * 60 * 5,
  });
}
