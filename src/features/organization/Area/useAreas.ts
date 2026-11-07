import { useEffect, useState } from "react";
import { listAreas } from "../../../core/services/organizationService";
import type { Area } from "../../../core/interfaces/organization.interface";

export const useAreas = () => {
  const [data, setData] = useState<Area[]>([]);

  const fetch = async () => {
    try {
      const response = await listAreas();
      setData(Array.isArray(response) ? response : []);
    } catch {
      // los componentes tsx no usan loading/error: se mantiene la lista vacía
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, refetch: fetch };
};
