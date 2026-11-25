import { useNavigate } from "react-router";
import Button from "../../../shared/components/Button/Button";
import SectionHeader from "../../layout/SectionHeader/SectionHeader";
import PlusIcon from "../../../shared/icons/PlusIcon";
import SearchIcon from "../../../shared/icons/SearchIcon";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import AreaCarousel from "./AreaCarousel";
import AreaProjectsTable from "./AreaProjectsTable";
import AreaProjectsModals from "./AreaProjectsModals";
import AreaProjectsSkeleton from "./AreaProjectsSkeleton";
import { useAreaProjects, type ProjectSort } from "./useAreaProjects";

export default function AreaProjectsPage() {
  const navigate = useNavigate();
  const {
    isLoading,
    areas,
    projects,
    filteredProjects,
    selectedAreaId,
    setSelectedAreaId,
    selectedArea,
    search,
    setSearch,
    modeFilter,
    setModeFilter,
    sort,
    setSort,
    areaModal,
    setAreaModal,
    specialtyModal,
    closeSpecialtyModal,
    projectModal,
    closeProjectModal,
    submitting,
    saveArea,
    saveSpecialty,
  } = useAreaProjects();

  const hasFilters = search !== "" || modeFilter !== "" || sort !== "asc";
  const sectionTitle = selectedArea
    ? `Proyectos de ${selectedArea.name}`
    : "Todos los proyectos";

  return (
    <main id="main-content" className="min-h-full">
      <SectionHeader
        title="Áreas y proyectos"
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAreaModal({ mode: "create" })}
            >
              <PlusIcon className="size-4" />
              <span>Crear área</span>
            </Button>
            <Button
              type="button"
              onClick={() =>
                navigate("/organizaciones/estructura?modal=proyecto")
              }
            >
              <PlusIcon className="size-4" />
              <span>Nuevo proyecto</span>
            </Button>
          </div>
        }
      />

      {isLoading && <AreaProjectsSkeleton />}
      {!isLoading && (
        <>
          <AreaCarousel
            areas={areas}
            projects={projects}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            onEditArea={(area) => setAreaModal({ mode: "edit", area })}
          />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {sectionTitle}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6">
              <div className="relative min-w-44 max-w-xs flex-1">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                <Input
                  type="search"
                  value={search}
                  placeholder="Buscar proyectos..."
                  className="!pl-8"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <Select
                value={modeFilter}
                aria-label="Filtrar por modo"
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setModeFilter(e.target.value)
                }
              >
                <option value="">Todos los modos</option>
                <option value="available">Disponible</option>
                <option value="assigned">Asignado</option>
              </Select>

              <Select
                value={sort}
                aria-label="Ordenar proyectos"
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSort(e.target.value as ProjectSort)
                }
              >
                <option value="asc">Nombre A-Z</option>
                <option value="desc">Nombre Z-A</option>
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguos</option>
              </Select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setModeFilter("");
                    setSort("asc");
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Limpiar
                </button>
              )}

              <span className="ml-auto text-xs text-neutral-400">
                {filteredProjects.length}{" "}
                {filteredProjects.length === 1 ? "proyecto" : "proyectos"}
              </span>
            </div>

            <AreaProjectsTable projects={filteredProjects} />
          </section>
        </>
      )}

      <AreaProjectsModals
        areaModal={areaModal}
        onCloseArea={() => setAreaModal(null)}
        onSaveArea={saveArea}
        specialtyModal={specialtyModal}
        onCloseSpecialty={closeSpecialtyModal}
        onSaveSpecialty={saveSpecialty}
        projectModal={projectModal}
        onCloseProject={closeProjectModal}
        submitting={submitting}
      />
    </main>
  );
}
