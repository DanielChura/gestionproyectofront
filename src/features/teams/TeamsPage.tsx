import { useState } from "react";
import { Link } from "react-router";
import { createTeam } from "../../core/services/organizationService";
import type { TeamWriteData } from "../../core/interfaces/organization.interface";
import ActivityIcon from "../../shared/Icons/ActivityIcon";
import ChevronDownIcon from "../../shared/Icons/ChevronIcon";
import DotsIcon from "../../shared/Icons/DotsIcon";
import PlusIcon from "../../shared/Icons/PlusIcon";
import SearchIcon from "../../shared/Icons/SearchIcon";
import StackIcon from "../../shared/Icons/StackIcon";
import UserIcon from "../../shared/Icons/UserIcon";
import { useAreas } from "../organization/Area/useAreas";
import TeamForm from "../organization/Teams/TeamForm/TeamForm";
import type { TeamFormState } from "../organization/Teams/TeamForm/useTeamForm";
import { useTeams } from "../organization/Teams/useTeams";
import BriefcaseIcon from "../../shared/Icons/BriefcaseIcon";
import Button from "../../shared/Button/Button";
import SecondaryButton from "../../shared/Button/SecondaryButton";
import Input from "../../shared/Input/Input";
import Select from "../../shared/Select/Select";

const emptyTeam: TeamFormState = { area: "", name: "", active: true };

function TeamsPage() {
  const { data, refetch } = useTeams();
  const { data: areas } = useAreas();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [appliedActive, setAppliedActive] = useState<boolean | undefined>(
    undefined,
  );
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const query = appliedSearch.trim().toLowerCase();
  const visible = data.filter(
    (team) =>
      (query === "" ||
        team.name.toLowerCase().includes(query) ||
        team.area_name.toLowerCase().includes(query)) &&
      (appliedActive === undefined || team.active === appliedActive),
  );
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

  const handleCreate = async (formData: TeamWriteData) => {
    setSubmitting(true);
    try {
      await createTeam(formData);
      await refetch();
      setCreating(false);
    } catch (e) {
      console.error("Error creating team:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-full text-neutral-800 dark:text-neutral-100"
      id="main-content"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg  text-neutral-800 dark:text-neutral-100">
            Equipos
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Consulta los equipos de la organización y accede a sus integrantes.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" /> Nuevo equipo
        </Button>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Equipos{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
            ({visible.length})
          </span>
        </h2>
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre o área"
            aria-label="Buscar equipos"
            onChange={(e) => setSearchInput(e.target.value)}
            className="!pl-8"
          />
        </div>
        <Select
          value={activeInput}
          aria-label="Filtrar por estado"
          onChange={(e) => setActiveInput(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
        <Button type="submit">Buscar equipo</Button>
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

      <section className="border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-neutral-600 dark:text-neutral-400 text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800  text-neutral-700 dark:text-neutral-300">
              <tr>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <BriefcaseIcon className="size-4" fill={false} /> Equipo
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <StackIcon className="size-4" /> Área
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-4" /> Integrantes
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
              {visible.map((team) => (
                <tr
                  key={team.id}
                  className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {team.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {team.area_name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {team.active_members}{" "}
                      {team.active_members === 1 ? "miembro" : "miembros"}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2.5  ${team.active ? "text-green-500" : "text-red-600"}`}
                  >
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {team.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/equipos/${team.id}`}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 py-1.5 text-xs  rounded-lg cursor-pointer whitespace-nowrap inline-flex items-center"
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <p
            role="status"
            className="m-0 px-3 py-8 text-xs text-neutral-600 dark:text-neutral-400 text-center"
          >
            {hasFilters
              ? "Sin equipos para los filtros aplicados."
              : "No hay equipos registrados."}
          </p>
        )}
      </section>

      {creating && (
        <TeamForm
          title="Nuevo equipo"
          submitLabel="Crear"
          initialData={emptyTeam}
          areas={areas}
          submitting={submitting}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}
    </main>
  );
}

export default TeamsPage;
