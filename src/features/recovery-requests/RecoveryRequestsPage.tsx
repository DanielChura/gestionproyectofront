import { useState } from "react";
import { useRecoveryRequests } from "./useRecoveryRequests";
import UserIcon from "../../shared/Icons/UserIcon";
import AtIcon from "../../shared/Icons/AtIcon";
import ClockIcon from "../../shared/Icons/ClockIcon";
import DotsIcon from "../../shared/Icons/DotsIcon";
import SearchIcon from "../../shared/Icons/SearchIcon";
import Input from "../../shared/Input/Input";

export default function RecoveryRequestsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const { requests, busy, issueReset } = useRecoveryRequests({
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

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg  text-neutral-800 dark:text-neutral-100">
            Solicitudes de recuperación
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Verifica la identidad antes de emitir el enlace de restablecimiento.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Solicitudes{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
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
            aria-label="Buscar solicitudes"
            onChange={(e) => setSearchInput(e.target.value)}
            className="!pl-8"
          />
        </div>

        <button
          type="submit"
          className="bg-neutral-800 text-neutral-100 hover:bg-neutral-700 px-3 py-1.5 text-xs  rounded-lg cursor-pointer dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
        >
          Buscar solicitud
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs  text-neutral-700 hover:text-neutral-800 px-2 py-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Limpiar
          </button>
        )}
      </form>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-neutral-600 dark:text-neutral-400 text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800  text-neutral-700 dark:text-neutral-300">
              <tr>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-4" />
                    Solicitante
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <AtIcon className="size-4" />
                    Correo
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-4" />
                    Solicitada
                  </span>
                </th>
                <th scope="col" className="p-3 items-center">
                  <span className="inline-flex items-center gap-1.5">
                    <DotsIcon className="size-4" />
                    Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {entry.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {entry.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {new Date(entry.requested_at).toLocaleString("es-PE")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 items-center">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => issueReset(entry.id)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-1.5 text-xs  rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Verificar y enviar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {requests.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 dark:text-neutral-400 text-center"
          >
            {hasFilters
              ? "Sin solicitudes para los filtros aplicados."
              : "No hay solicitudes pendientes."}
          </p>
        )}
      </section>
    </main>
  );
}
