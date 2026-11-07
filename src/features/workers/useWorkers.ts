import { useCallback, useEffect, useRef, useState } from "react";
import { listWorkers } from "../../core/services/workerService";
import type {
  Worker,
  WorkerFilters,
} from "../../core/interfaces/worker.interface";

export const useWorkers = (filters?: WorkerFilters) => {
  const [data, setData] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listWorkers(filtersRef.current);
      setData(Array.isArray(response) ? response : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, [fetch, filters?.search, filters?.disponible]);

  return { data, loading, error, refetch: fetch };
};
