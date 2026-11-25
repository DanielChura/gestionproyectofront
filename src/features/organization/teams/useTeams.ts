import { useEffect, useState } from "react";
import { listTeams } from "../../../core/services/organizationService";
import type { Team } from "../../../core/interfaces/organization.interface";

export const useTeams = () => {
  const [data, setData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const response = await listTeams();
      setData(Array.isArray(response) ? response : []);
    } catch {
      // los componentes tsx no usan loading/error: se mantiene la lista vacía
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, loading, refetch: fetch };
};
