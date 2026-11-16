import { useQuery } from "@tanstack/react-query";
import { errorText, sessionVersion } from "../../../../auth/api";
import { getProjectAssignmentTeams } from "../../../../../core/services/projectService";
import type { TeamOption } from "../../../../../core/interfaces/task.interface";

export function useAssignmentTeams(projectId: number, enabled: boolean, initial?: TeamOption[]) {
  const query = useQuery<TeamOption[]>({
    queryKey: ["project-assignment-teams", projectId, sessionVersion()],
    queryFn: () => getProjectAssignmentTeams(projectId),
    enabled,
    initialData: initial?.length ? initial : undefined,
    staleTime: 5 * 60 * 1000,
  });
  return { teams: query.data ?? [], error: query.error ? errorText(query.error) : "", loading: query.isFetching };
}
