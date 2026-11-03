import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  errorText,
  type Account,
  type Area,
  type DetailResult,
} from "../auth/api";
import { useToast } from "../../hooks/useToast";

export interface AccountFilters {
  search?: string;
  active?: boolean;
}

async function fetchAllAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const data = await apiRequest<any>(`admin/accounts/?${query.toString()}`);
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

export function useAccounts(filters: AccountFilters = {}) {
  const { search = "", active } = filters;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [accountList, areaData] = await Promise.all([
        fetchAllAccounts(),
        apiRequest<any>("admin/areas/"),
      ]);
      setAccounts(accountList);
      setAreas(
        Array.isArray(areaData)
          ? areaData
          : Array.isArray(areaData?.results)
            ? areaData.results
            : [],
      );
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

  const resendInvitation = async (accountId: number) => {
    setBusy(true);
    try {
      const result = await apiRequest<DetailResult>(
        `admin/accounts/${accountId}/resend-invitation/`,
        { method: "POST" },
      );
      addToast({
        icon: "success",
        title: "Invitación reenviada",
        message: result.detail,
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo reenviar",
        message: errorText(failure),
      });
    } finally {
      await load();
      setBusy(false);
    }
  };

  return {
    accounts: visibleAccounts,
    areas,
    busy,
    resendInvitation,
    reload: load,
  };
}