import { useState } from "react";
import { useRecoveryRequests } from "./useRecoveryRequests";
import UserIcon from "../../../shared/icons/UserIcon";
import AtIcon from "../../../shared/icons/AtIcon";
import ClockIcon from "../../../shared/icons/ClockIcon";
import DotsIcon from "../../../shared/icons/DotsIcon";
import SearchIcon from "../../../shared/icons/SearchIcon";
import SendIcon from "../../../shared/icons/SendIcon";
import Input from "../../../shared/components/Input/Input";
import SectionHeader from "../../layout/SectionHeader/SectionHeader";
import Table, {
  type TableColumn,
} from "../../../shared/components/Table/Table";
import type { RecoveryRequest } from "../../../core/interfaces/auth.interface";

export default function RecoveryRequestsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const { requests, busy, issueReset, isLoading } = useRecoveryRequests({
    search: appliedSearch || undefined,
  });
  const hasFilters = appliedSearch !== "";

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
  };

  const columns: TableColumn<RecoveryRequest>[] = [
    {
      key: "name",
      header: "Solicitante",
      icon: UserIcon,
      render: (entry) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {entry.name}
        </span>
      ),
    },
    {
      key: "email",
      header: "Correo",
      icon: AtIcon,
      render: (entry) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {entry.email}
        </span>
      ),
    },
    {
      key: "requested_at",
      header: "Solicitada",
      icon: ClockIcon,
      render: (entry) => (
        <span className="flex items-center min-w-0 line-clamp-1">
          {new Date(entry.requested_at).toLocaleString("es-PE")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      icon: DotsIcon,
      cellClassName: "w-16",
      render: (entry) => (
        <button
          type="button"
          disabled={busy}
          onClick={() => issueReset(entry.id)}
          title="Verificar y enviar"
          className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <SendIcon className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <SectionHeader title="Solicitudes de recuperación" />

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm text-neutral-800 dark:text-neutral-100">
          Solicitudes{" "}
          <span className="text-neutral-600 dark:text-neutral-400">
            ({requests.length})
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

        <button
          type="submit"
          className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 px-3 py-1.5 text-xs rounded-md dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
        >
          Buscar solicitud
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-neutral-700 hover:text-neutral-800 px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Limpiar
          </button>
        )}
      </form>

      <Table
        columns={columns}
        data={requests}
        keyExtractor={(entry) => entry.id}
        isLoading={isLoading}
        skeletonRows={6}
        emptyMessage={
          hasFilters
            ? "Sin solicitudes para los filtros aplicados."
            : "No hay solicitudes pendientes."
        }
      />
    </main>
  );
}
