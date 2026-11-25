import { useQuery } from "@tanstack/react-query";
import type { Team } from "../../core/interfaces/organization.interface";
import { listMyTeams } from "../../core/services/organizationService";
import { useAuth } from "../../hooks/useAuth";

export function useMyTeams() {
  const { isAuthenticated } = useAuth();

  const {
    data: teams = [],
    isLoading,
    refetch,
  } = useQuery<Team[]>({
    queryKey: ["my-teams"],
    enabled: isAuthenticated,
    queryFn: listMyTeams,
    staleTime: 1000 * 60 * 5,
  });

  return { teams, isLoading, refetch };
}
