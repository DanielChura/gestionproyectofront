import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  errorText,
  type DetailResult,
  type RecoveryRequest,
} from "../auth/api";
import { useToast } from "../../hooks/useToast";

async function fetchAllRecoveryRequests(): Promise<RecoveryRequest[]> {
  const requests: RecoveryRequest[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const data = await apiRequest<any>(`admin/recovery-requests/?${query.toString()}`);
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    requests.push(...rows);
    cursor = Array.isArray(data) ? null : (data?.next_cursor ?? null);
    if (!cursor) break;
  }
  return requests;
}

export interface RecoveryRequestFilters {
  search?: string;
}

export function useRecoveryRequests(filters: RecoveryRequestFilters = {}) {
  const { search = "" } = filters;
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      setRequests(await fetchAllRecoveryRequests());
    } catch (failure) {
      addToast({
        icon: "error",
        title: "Error al cargar",
        message: errorText(failure),
      });
    }
  }, [addToast]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter(
      (entry) =>
        entry.name.toLowerCase().includes(term) ||
        entry.email.toLowerCase().includes(term),
    );
  }, [requests, search]);

  const issueReset = async (requestId: number) => {
    setBusy(true);
    try {
      const result = await apiRequest<DetailResult>(
        `admin/recovery-requests/${requestId}/issue/`,
        { method: "POST" },
      );
      addToast({
        icon: "success",
        title: "Enlace de recuperación enviado",
        message: result.detail,
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo emitir el enlace",
        message: errorText(failure),
      });
    } finally {
      await load();
      setBusy(false);
    }
  };

  return { requests: visibleRequests, busy, issueReset };
}