import { getActiveAreaOptions } from "../../../core/services/organizationService";
import { useAuth } from "../../../hooks/useAuth";
import { checkSession, sessionVersion } from "../../auth/api";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  errorText,
  type Account,
  type Area,
  type DetailResult,
} from "../../auth/api";
import { useToast } from "../../../hooks/useToast";

export interface AccountFilters {
  search?: string;
  active?: boolean;
}

type PaginatedResponse<T> =
  T[] | { results?: T[]; next_cursor?: string | null };

async function fetchAllAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const data = await apiRequest<PaginatedResponse<Account>>(
      `admin/accounts/?${query.toString()}`,
    );
    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : [];
    accounts.push(...rows);
    cursor = Array.isArray(data) ? null : (data?.next_cursor ?? null);
    if (!cursor) break;
  }
  return accounts;
}

export function useActiveAreas() {
  const { isAdmin } = useAuth();
  const epoch = sessionVersion();
  return useQuery<Area[]>({
    queryKey: ["admin-areas", epoch],
    enabled: isAdmin,
    queryFn: ({ signal }) => {
      checkSession(epoch);
      return getActiveAreaOptions(signal);
    },
    retry: false,
  });
}

export function useAccounts(filters: AccountFilters = {}) {
  const { search = "", active } = filters;
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [], refetch: refetchAccounts } = useQuery<Account[]>(
    {
      queryKey: ["accounts"],
      queryFn: fetchAllAccounts,
    },
  );

  const { data: areas = [], refetch: refetchAreas } = useActiveAreas();

  const resendMutation = useMutation({
    mutationFn: (accountId: number) =>
      apiRequest<DetailResult>(
        `admin/accounts/${accountId}/resend-invitation/`,
        {
          method: "POST",
        },
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      addToast({
        icon: "success",
        title: "Invitación reenviada",
        message: result.detail,
      });
    },
    onError: (failure) => {
      addToast({
        icon: "error",
        title: "No se pudo reenviar",
        message: errorText(failure),
      });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (accountId: number) =>
      apiRequest<DetailResult>(`admin/accounts/${accountId}/unlock/`, {
        method: "POST",
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      addToast({
        icon: "success",
        title: "Cuenta desbloqueada",
        message: result.detail,
      });
    },
    onError: (failure) => {
      addToast({
        icon: "error",
        title: "No se pudo desbloquear",
        message: errorText(failure),
      });
    },
  });

  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (active !== undefined && account.active !== active) return false;
      if (!term) return true;
      return (
        account.name.toLowerCase().includes(term) ||
        account.email.toLowerCase().includes(term)
      );
    });
  }, [accounts, search, active]);

  const reload = async () => {
    await Promise.all([refetchAccounts(), refetchAreas()]);
  };

  return {
    accounts: visibleAccounts,
    areas,
    busy: resendMutation.isPending || unlockMutation.isPending,
    resendInvitation: resendMutation.mutateAsync,
    unlockAccount: unlockMutation.mutateAsync,
    reload,
  };
}
