import { useEffect, useState } from "react";
import { errorText } from "../../../../auth/api";
import { getProjectAssignmentTeams } from "../../../../../core/services/projectService";
import type { TeamOption } from "../../../../../core/interfaces/task.interface";

export function useAssignmentTeams(
  projectId: number,
  enabled: boolean,
  initial?: TeamOption[],
) {
  const [teams, setTeams] = useState<TeamOption[]>(initial ?? []);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(Boolean(initial?.length));

  useEffect(() => {
    if (!enabled || loaded) return;
    let active = true;
    setError("");
    getProjectAssignmentTeams(projectId)
      .then((items) => {
        if (active) {
          setTeams(items);
          setLoaded(true);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(errorText(failure));
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [enabled, loaded, projectId]);

  return { teams, error, loading: enabled && !loaded };
}
