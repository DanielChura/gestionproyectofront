import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import InvitationModal from "./InvitationModal/InvitationModal";
import { useAccounts } from "./useAccounts";
import PlusIcon from "../../../shared/icons/PlusIcon";
import SearchIcon from "../../../shared/icons/SearchIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import AtIcon from "../../../shared/icons/AtIcon";
import StackIcon from "../../../shared/icons/StackIcon";
import AdminIcon from "../../../shared/icons/AdminIcon";
import ActivityIcon from "../../../shared/icons/ActivityIcon";
import DotsIcon from "../../../shared/icons/DotsIcon";
import SendIcon from "../../../shared/icons/SendIcon";
import KeyIcon from "../../../shared/icons/KeyIcon";
import HourglassIcon from "../../../shared/icons/HourglassIcon";
import Button from "../../../shared/components/Button/Button";
import SectionHeader from "../../layout/SectionHeader/SectionHeader";
import Table, {
  type TableColumn,
} from "../../../shared/components/Table/Table";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import { roleLabel } from "../../auth/roles";
import type { Account } from "../../../core/interfaces/auth.interface";

function emailStatus(account: Account): { text: string; className: string } | null {
  if (account.active) return null;
  if (account.delivery_status === "accepted")
    return {
      text: "Correo enviado",
      className: "text-neutral-500 dark:text-neutral-400",
    };
  if (account.delivery_status === "failed")
    return { text: "Correo rechazado", className: "text-red-600 dark:text-red-400" };
  if (account.delivery_status === "unknown")
    return { text: "Correo sin confirmar", className: "text-amber-600 dark:text-amber-400" };
  if (account.delivery_status === "sending")
    return { text: "Enviando correo", className: "text-blue-600 dark:text-blue-400" };
  return {
    text: "Sin correo enviado",
    className: "text-neutral-500 dark:text-neutral-400",
  };
}

export default function AccountsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [appliedActive, setAppliedActive] = useState<boolean | undefined>(
    undefined,
  );
  const {
    accounts,
    areas,
    busy,
    resendingId,
    unlockingId,
    resendInvitation,
    unlockAccount,
    reload,
    isLoading,
  } = useAccounts({
    search: appliedSearch || undefined,
    active: appliedActive,
  });
  const [inviting, setInviting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const hasFilters = appliedSearch !== "" || appliedActive !== undefined;

  useEffect(() => {
    if (searchParams.get("nuevo") !== "invitar") return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setInviting(true);
      const next = new URLSearchParams(searchParams);
      next.delete("nuevo");
      setSearchParams(next, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedActive(activeInput === "" ? undefined : activeInput === "true");
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setActiveInput("");
    setAppliedActive(undefined);
  };

  const columns: TableColumn<Account>[] = [
    {
      key: "name",
      header: "Cuenta",
      icon: UserIcon,
      render: (account) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {account.name}
        </span>
      ),
    },
    {
      key: "email",
      header: "Correo",
      icon: AtIcon,
      render: (account) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {account.email}
        </span>
      ),
    },
    {
      key: "areas",
      header: "Áreas",
      icon: StackIcon,
      render: (account) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {account.all_areas
            ? "Todas las áreas activas"
            : account.areas
                .map((area: { id: number; name: string }) => area.name)
                .join(", ") || "Sin áreas activas"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      icon: AdminIcon,
      render: (account) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {roleLabel(account.role)}
        </span>
      ),
    },
    {
      key: "active",
      header: "Estado",
      icon: ActivityIcon,
      render: (account) => {
        const email = emailStatus(account);
        return (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={`line-clamp-1 ${
                account.active ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {account.active ? "Activa" : "Pendiente"}
            </span>
            {email && (
              <span className={`line-clamp-1 ${email.className}`}>
                {email.text}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Acciones",
      icon: DotsIcon,
      cellClassName: "w-24",
      render: (account) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy || account.active}
            aria-busy={resendingId === account.id ? "true" : undefined}
            aria-label="Reenviar invitación"
            onClick={() => resendInvitation(account.id)}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {resendingId === account.id ? (
              <HourglassIcon className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={unlockingId === account.id ? "true" : undefined}
            aria-label="Desbloquear cuenta"
            onClick={() => unlockAccount(account.id)}
            className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {unlockingId === account.id ? (
              <HourglassIcon className="size-4" />
            ) : (
              <KeyIcon className="size-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <SectionHeader
        title="Cuentas y accesos"
        action={
          <Button type="button" onClick={() => setInviting(true)}>
            <PlusIcon className="size-4" /> Registrar e invitar
          </Button>
        }
      />

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm text-neutral-800 dark:text-neutral-100">
          Cuentas{" "}
          <span className="text-neutral-600 dark:text-neutral-400">
            ({accounts.length})
          </span>
        </h2>
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre o correo"
            onChange={(e) => setSearchInput(e.target.value)}
            className="!pl-8"
          />
        </div>
        <Select
          value={activeInput}
          onChange={(e) => setActiveInput(e.target.value)}
        >
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Pendientes</option>
        </Select>
        <Button type="submit">Buscar cuenta</Button>
        {hasFilters && (
          <Button
            variant="secondary"
            type="button"
            onClick={clearFilters}
            className="px-2 py-1.5"
          >
            Limpiar
          </Button>
        )}
      </form>

      <Table
        columns={columns}
        data={accounts}
        keyExtractor={(account) => account.id}
        isLoading={isLoading}
        skeletonRows={8}
        emptyMessage={
          hasFilters
            ? "Sin cuentas para los filtros aplicados."
            : "No hay cuentas registradas."
        }
      />

      {inviting && (
        <InvitationModal
          areas={areas}
          onClose={() => setInviting(false)}
          onUpdate={reload}
        />
      )}
    </main>
  );
}
