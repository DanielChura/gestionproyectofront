import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveAreaOptions } from "../../../core/services/organizationService";
import {
  listAccounts,
  resendInvitation,
  unlockAccount,
} from "../../../core/services/authService";
import {
  checkSession,
  errorText,
  sessionVersion,
} from "../../../core/api/httpClient";
import type {
  Account,
  SessionArea,
} from "../../../core/interfaces/auth.interface";
import { useAuth } from "../../../hooks/useAuth";
import { useToast } from "../../../hooks/useToast";

export interface AccountFilters {
  search?: string;
  active?: boolean;
}

export function useActiveAreas() {
  const { isAdmin } = useAuth();
  const epoch = sessionVersion();
  return useQuery<SessionArea[]>({
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

  const {
    data: accounts = [],
    refetch: refetchAccounts,
    isLoading: accountsLoading,
  } = useQuery<Account[]>(
    {
      queryKey: ["accounts"],
      queryFn: listAccounts,
    },
  );

  const { data: areas = [], refetch: refetchAreas, isLoading: areasLoading } =
    useActiveAreas();

  const resendMutation = useMutation({
    mutationFn: (accountId: number) => resendInvitation(accountId),
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
    mutationFn: (accountId: number) => unlockAccount(accountId),
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
    isLoading: accountsLoading || areasLoading,
    accounts: visibleAccounts,
    areas,
    busy: resendMutation.isPending || unlockMutation.isPending,
    resendInvitation: resendMutation.mutateAsync,
    unlockAccount: unlockMutation.mutateAsync,
    reload,
  };
}
