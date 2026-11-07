import { useState } from "react";
import ChevronDownIcon from "../../shared/Icons/ChevronIcon";
import EditIcon from "../../shared/Icons/EditIcon";
import PlusIcon from "../../shared/Icons/PlusIcon";
import SearchIcon from "../../shared/Icons/SearchIcon";
import { useToast } from "../../hooks/useToast";
import Button from "../../shared/Button/Button";
import SecondaryButton from "../../shared/Button/SecondaryButton";
import type {
  Publication,
  PublicationCreateData,
  PublicationStateCode,
  PublicationUpdateData,
} from "../../core/interfaces/publication.interface";
import { publicationErrorText } from "../../core/services/publicationService";
import PublicationForm from "./components/PublicationForm";
import { usePublicationCatalogs } from "./hooks/usePublicationCatalogs";
import { usePublications } from "./hooks/usePublications";
import {
  PUBLICATION_STATE_LABELS,
  formatPublicationDate,
} from "./utils/publication";

function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs  text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        Reintentar
      </button>
    </div>
  );
}

const STATE_TEXT: Record<PublicationStateCode, string> = {
  BORRADOR: "text-amber-600 dark:text-amber-400",
  ABIERTA: "text-emerald-600 dark:text-emerald-400",
  CERRADA: "text-neutral-500 dark:text-neutral-400",
  CANCELADA: "text-red-600 dark:text-red-400",
};

export default function PublicationsManager() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [appliedState, setAppliedState] = useState<"" | PublicationStateCode>(
    "",
  );
  const [projectInput, setProjectInput] = useState("");
  const [appliedProject, setAppliedProject] = useState("");
  const [form, setForm] = useState<{ publication?: Publication } | null>(null);
  const { addToast } = useToast();

  const { data, loading, error, refetch, create, update } = usePublications({
    search: appliedSearch || undefined,
    state: appliedState || undefined,
    project_id: appliedProject ? Number(appliedProject) : undefined,
  });
  const catalogsQuery = usePublicationCatalogs(true);
  const catalogs = catalogsQuery.data;
  const canWrite = catalogs !== null && !catalogsQuery.error;
  const hasFilters =
    appliedSearch !== "" || appliedState !== "" || appliedProject !== "";

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedState(stateInput as "" | PublicationStateCode);
    setAppliedProject(projectInput);
  }

  function clearFilters() {
    setSearchInput("");
    setAppliedSearch("");
    setStateInput("");
    setAppliedState("");
    setProjectInput("");
    setAppliedProject("");
  }

  function openCreate() {
    if (canWrite) setForm({});
  }

  function openEdit(publication: Publication) {
    if (canWrite) setForm({ publication });
  }

  async function save(payload: PublicationCreateData | PublicationUpdateData) {
    if (form?.publication) {
      await update(form.publication.id, payload as PublicationUpdateData);
      addToast({
        icon: "success",
        title: "Publicación actualizada",
        message: "Los cambios se guardaron correctamente.",
      });
    } else {
      await create(payload as PublicationCreateData);
      addToast({
        icon: "success",
        title: "Publicación creada",
        message: "La oferta quedó en estado borrador.",
      });
    }
  }

  return (
    <main
      id="main-content"
      className="min-h-full text-neutral-800 dark:text-neutral-100"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="m-0 text-lg  text-neutral-800 dark:text-neutral-100">
            Publicaciones
          </h1>
          <p className="m-0 mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            Gestiona las ofertas de empleo de tus proyectos.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          disabled={!canWrite}
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" />
          Nueva publicación
        </Button>
      </header>

      {catalogsQuery.error && (
        <ErrorAlert
          message="No se pudieron cargar los catálogos para crear o editar publicaciones."
          onRetry={catalogsQuery.retry}
        />
      )}
      {error && data && data.length > 0 && (
        <ErrorAlert message={error} onRetry={() => void refetch()} />
      )}

      <form
        onSubmit={applyFilters}
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <h2 className="m-0 mr-auto text-sm  text-neutral-800 dark:text-neutral-100">
          Publicaciones{" "}
          <span className="font-normal text-neutral-600 dark:text-neutral-400">
            ({data.length})
          </span>
        </h2>

        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
          <input
            type="search"
            value={searchInput}
            maxLength={100}
            placeholder="Buscar por título o proyecto"
            aria-label="Buscar publicaciones"
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 pl-8 pr-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={stateInput}
            aria-label="Filtrar por estado"
            onChange={(event) => setStateInput(event.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 pl-3 pr-8 py-1.5 text-xs rounded-lg appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los estados</option>
            {Object.entries(PUBLICATION_STATE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
        </div>

        <div className="relative">
          <select
            value={projectInput}
            aria-label="Filtrar por proyecto"
            onChange={(event) => setProjectInput(event.target.value)}
            className="max-w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 pl-3 pr-8 py-1.5 text-xs rounded-lg appearance-none focus:border-neutral-400 focus:outline-none cursor-pointer truncate"
          >
            <option value="">Todos los proyectos</option>
            {(catalogs?.projects ?? []).map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-600 dark:text-neutral-400" />
        </div>

        <Button type="submit" disabled={loading}>
          Buscar publicación
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

      {loading && data.length === 0 ? null : error && data.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm  text-neutral-800 dark:text-neutral-100">
            No se pudieron cargar las publicaciones
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs  text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Reintentar
          </button>
        </section>
      ) : data.length === 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm  text-neutral-800 dark:text-neutral-100">
            {hasFilters ? "Sin resultados" : "Aún no hay publicaciones"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {hasFilters
              ? "No hay publicaciones que coincidan con los filtros aplicados."
              : "Crea la primera oferta de empleo y publícala cuando esté lista."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs  text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              Limpiar filtros
            </button>
          ) : (
            canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs  text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
              >
                <PlusIcon className="size-4" />
                Crear publicación
              </button>
            )
          )}
        </section>
      ) : (
        <section className="border border-neutral-200 dark:border-neutral-800 overflow-hidden rounded-xl">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-neutral-600 dark:text-neutral-400">
              <thead className="border-b border-neutral-200 dark:border-neutral-800  text-neutral-700 dark:text-neutral-300">
                <tr>
                  <th scope="col" className="p-3">
                    Título
                  </th>
                  <th scope="col" className="p-3">
                    Proyecto
                  </th>
                  <th scope="col" className="p-3">
                    Vacantes
                  </th>
                  <th scope="col" className="p-3">
                    Horas/sem
                  </th>
                  <th scope="col" className="p-3">
                    Estado
                  </th>
                  <th scope="col" className="p-3">
                    Cierre
                  </th>
                  <th scope="col" className="p-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(data) ? (
                  data.map((publication) => {
                  const editable = canWrite && publication.permissions.edit;
                  return (
                    <tr
                      key={publication.id}
                      className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <td className="px-3 py-2.5  text-neutral-800 dark:text-neutral-100">
                        {publication.title}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="line-clamp-1">
                          {publication.project.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {publication.available_vacancies} /{" "}
                        {publication.vacancies}
                      </td>
                      <td className="px-3 py-2.5">
                        {Number(publication.weekly_hours)} h
                      </td>
                      <td
                        className={`px-3 py-2.5  ${STATE_TEXT[publication.state]}`}
                      >
                        {PUBLICATION_STATE_LABELS[publication.state]}
                      </td>
                      <td className="px-3 py-2.5">
                        {formatPublicationDate(publication.closing_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(publication)}
                            disabled={!editable}
                            aria-label={`Editar ${publication.title}`}
                            className="cursor-pointer rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <EditIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })) : null}
              </tbody>
            </table>
          </div>
          {data.length === 0 && null}
        </section>
      )}

      {!loading && Array.isArray(data) && data.length >= 200 && (
        <p className="mt-3 text-[10px] text-neutral-500 dark:text-neutral-400">
          Se muestran las 200 publicaciones más recientes.
        </p>
      )}

      {form && catalogs && (
        <PublicationForm
          key={form.publication?.id ?? "new"}
          publication={form.publication}
          catalogs={catalogs}
          onClose={() => setForm(null)}
          onSubmit={save}
        />
      )}
    </main>
  );
}
