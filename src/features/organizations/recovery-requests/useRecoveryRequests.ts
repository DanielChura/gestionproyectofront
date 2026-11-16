import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  errorText,
  type DetailResult,
  type RecoveryRequest,
} from "../../auth/api";
import { useToast } from "../../../hooks/useToast";

type PaginatedResponse<T> = T[] | { results?: T[]; next_cursor?: string | null };

async function fetchAllRecoveryRequests(): Promise<RecoveryRequest[]> {
  const requests: RecoveryRequest[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const data = await apiRequest<PaginatedResponse<RecoveryRequest>>(
      `admin/recovery-requests/?${query.toString()}`,
    );
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
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery<RecoveryRequest[]>({
    queryKey: ["recovery-requests"],
    queryFn: fetchAllRecoveryRequests,
  });

  const resetMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest<DetailResult>(
        `admin/recovery-requests/${requestId}/issue-reset/`,
        { method: "POST" },
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["recovery-requests"] });
      addToast({
        icon: "success",
        title: "Enlace generado",
        message: result.detail,
      });
    },
    onError: (failure) => {
      addToast({
        icon: "error",
        title: "No se pudo generar",
        message: errorText(failure),
      });
    },
  });

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term),
    );
  }, [requests, search]);

  return {
    requests: visibleRequests,
    busy: resetMutation.isPending,
    issueReset: resetMutation.mutateAsync,
  };
}
