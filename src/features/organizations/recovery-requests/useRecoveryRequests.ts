import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  issueReset,
  listRecoveryRequests,
} from "../../../core/services/authService";
import { errorText } from "../../../core/api/httpClient";
import type { RecoveryRequest } from "../../../core/interfaces/auth.interface";
import { useToast } from "../../../hooks/useToast";

export interface RecoveryRequestFilters {
  search?: string;
}

export function useRecoveryRequests(filters: RecoveryRequestFilters = {}) {
  const { search = "" } = filters;
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery<RecoveryRequest[]>({
    queryKey: ["recovery-requests"],
    queryFn: listRecoveryRequests,
  });

  const resetMutation = useMutation({
    mutationFn: (requestId: number) => issueReset(requestId),
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
