import { useState } from "react";
import ActivityIcon from "../../shared/Icons/ActivityIcon";
import AtIcon from "../../shared/Icons/AtIcon";
import ClockIcon from "../../shared/Icons/ClockIcon";
import DotsIcon from "../../shared/Icons/DotsIcon";
import EditIcon from "../../shared/Icons/EditIcon";
import HashIcon from "../../shared/Icons/HashIcon";
import SearchIcon from "../../shared/Icons/SearchIcon";
import UserIcon from "../../shared/Icons/UserIcon";
import ChevronDownIcon from "../../shared/Icons/ChevronIcon";
import { useWorkers } from "./useWorkers";
import { useAreas } from "../organization/Area/useAreas";
import WorkerForm from "./WorkerForm/WorkerForm";
import { updateWorker } from "../../core/services/workerService";
import type {
  Worker,
  WorkerUpdateData,
} from "../../core/interfaces/worker.interface";
import StackIcon from "../../shared/Icons/StackIcon";
import Button from "../../shared/Button/Button";
import SecondaryButton from "../../shared/Button/SecondaryButton";
import Input from "../../shared/Input/Input";
import Select from "../../shared/Select/Select";

function WorkersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [disponibleInput, setDisponibleInput] = useState("");
  const [disponible, setDisponible] = useState<boolean | undefined>(undefined);
  const { data, loading, refetch } = useWorkers({
    search: appliedSearch || undefined,
    disponible,
  });
  const { data: areas } = useAreas();
  const areaNameById = new Map(areas.map((area) => [area.id, area.name]));
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasFilters = appliedSearch !== "" || disponible !== undefined;

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchInput.trim());
    setDisponible(
      disponibleInput === "" ? undefined : disponibleInput === "true",
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setDisponibleInput("");
    setDisponible(undefined);
  };

  const handleSubmit = async (formData: WorkerUpdateData) => {
    if (editingWorker == null) return;
    setSubmitting(true);
    try {
      await updateWorker(editingWorker.id, formData);
      refetch();
      setEditingWorker(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-full text-neutral-800 dark:text-neutral-100">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg  text-neutral-800 dark:text-neutral-100">
            Gestión de Trabajadores
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Listado de trabajadores registrados y su disponibilidad.
          </p>
        </div>
      </header>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap items-center gap-2 mb-6"
      >
        <h2 className="m-0 mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Trabajadores{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
            ({data.length})
          </span>
        </h2>
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <Input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por nombre, apellido o código"
            aria-label="Buscar trabajadores"
            onChange={(e) => setSearchInput(e.target.value)}
            className="!pl-8"
          />
        </div>
        <Select
          value={disponibleInput}
          aria-label="Filtrar por disponibilidad"
          onChange={(e) => setDisponibleInput(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="true">Sin proyecto</option>
          <option value="false">Con proyecto</option>
        </Select>
        <Button type="submit" disabled={loading}>
          Buscar trabajador
        </Button>
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
                    <HashIcon className="size-4" /> Código
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon className="size-4" /> Trabajador
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <AtIcon className="size-4" /> Correo
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <StackIcon className="size-4" /> Área
                  </span>
                </th>
                <th scope="col" className="p-3">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-4" /> Horas/sem
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
              {data.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.code}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.first_names} {worker.last_names}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.area != null
                        ? (areaNameById.get(worker.area) ?? "—")
                        : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.weekly_hours} h
                    </span>
                  </td>
                  <td
                    className={`px-3 py-2.5  ${worker.active ? "text-green-500" : "text-red-600"}`}
                  >
                    <span className="flex items-center min-w-0 line-clamp-1">
                      {worker.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center justify-center"
                      onClick={() => setEditingWorker(worker)}
                      aria-label={`Editar ${worker.first_names} ${worker.last_names}`}
                    >
                      <EditIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingWorker != null && (
        <WorkerForm
          key={editingWorker.id}
          worker={editingWorker}
          areas={areas}
          submitting={submitting}
          onClose={() => setEditingWorker(null)}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  );
}

export default WorkersPage;
