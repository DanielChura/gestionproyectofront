import { useState } from "react";

import InvitationModal from "./InvitationModal/InvitationModal";
import { useAccounts } from "./useAccounts";
import PlusIcon from "../../shared/icons/PlusIcon";
import SearchIcon from "../../shared/icons/SearchIcon";
import ChevronDownIcon from "../../shared/icons/ChevronIcon";
import UserIcon from "../../shared/icons/UserIcon";
import AtIcon from "../../shared/icons/AtIcon";
import StackIcon from "../../shared/icons/StackIcon";
import AdminIcon from "../../shared/icons/AdminIcon";
import ActivityIcon from "../../shared/icons/ActivityIcon";
import DotsIcon from "../../shared/icons/DotsIcon";
import Button from "../../shared/Button/Button";
import SecondaryButton from "../../shared/Button/SecondaryButton";
import Input from "../../shared/Input/Input";
import Select from "../../shared/Select/Select";
import { roleLabel } from "../auth/roles";

export default function AccountsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [appliedActive, setAppliedActive] = useState<boolean | undefined>(
    undefined,
  );
  const { accounts, areas, busy, resendInvitation, reload } = useAccounts({
    search: appliedSearch || undefined,
    active: appliedActive,
  });
  const [inviting, setInviting] = useState(false);
  const hasFilters = appliedSearch !== "" || appliedActive !== undefined;

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

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg  text-neutral-800 dark:text-neutral-100">
            Cuentas y accesos
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Registra trabajadores, asigna sus áreas y gestiona el acceso al
            sistema.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setInviting(true)}
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" /> Registrar e invitar
        </Button>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Cuentas{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
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
            aria-label="Buscar cuentas"
            onChange={(e) => setSearchInput(e.target.value)}
            className="!pl-8"
          />
        </div>
        <Select
          value={activeInput}
          aria-label="Filtrar por estado"
          onChange={(e) => setActiveInput(e.target.value)}
        >
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Pendientes</option>
        </Select>
        <Button type="submit">Buscar cuenta</Button>
        {hasFilters && (
          <SecondaryButton
            type="button"
            onClick={clearFilters}
            className="px-2 py-1.5"
          >
            Limpiar
          </SecondaryButton>
        )}
      </form>

      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-neutral-600 dark:text-neutral-400 text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800  text-neutral-700 dark:text-neutral-300">
              <tr>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-4" /> Cuenta
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <AtIcon className="size-4" /> Correo
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <StackIcon className="size-4" /> Áreas
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <AdminIcon className="size-4" /> Rol
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <ActivityIcon className="size-4" /> Estado
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <DotsIcon className="size-4" /> Acciones
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.all_areas
                        ? "Todas las áreas activas"
                        : account.areas.map((area) => area.name).join(", ") ||
                          "Sin áreas activas"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {roleLabel(account.role)}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2.5  ${account.active ? "text-green-500" : "text-yellow-400"}`}
                  >
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {account.active ? "Activa" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <SecondaryButton
                      type="button"
                      disabled={busy || account.active}
                      onClick={() => resendInvitation(account.id)}
                      className="px-2 py-1.5 whitespace-nowrap"
                    >
                      Reenviar invitación
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accounts.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 dark:text-neutral-400 text-center"
          >
            {hasFilters
              ? "Sin cuentas para los filtros aplicados."
              : "No hay cuentas registradas."}
          </p>
        )}
      </section>

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
