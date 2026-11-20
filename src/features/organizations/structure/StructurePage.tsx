import { useNavigate } from "react-router";
import Button from "../../../shared/components/Button/Button";
import SectionHeader from "../../layout/SectionHeader/SectionHeader";
import PlusIcon from "../../../shared/icons/PlusIcon";
import AreaCarousel from "./AreaCarousel";
import AreaProjectsSection from "./AreaProjectsSection";
import StructureModals from "./StructureModals";
import StructureSkeleton from "./StructureSkeleton";
import { useStructure } from "./useStructure";

export default function StructurePage() {
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
  } = useStructure();

  return (
    <main id="main-content" className="min-h-full">
      <SectionHeader
        title="Áreas y proyectos"
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => navigate("/organizaciones/estructura?modal=proyecto")}
          >
            <PlusIcon className="size-4" />
            <span>Nuevo proyecto</span>
          </Button>
        }
      />

      {isLoading && <StructureSkeleton />}
      {!isLoading && (
        <>
          <AreaCarousel
            areas={areas}
            projects={projects}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            onNewArea={() => setAreaModal({ mode: "create" })}
            onEditArea={(area) => setAreaModal({ mode: "edit", area })}
          />

          <AreaProjectsSection
            selectedArea={selectedArea}
            projects={filteredProjects}
            search={search}
            onSearchChange={setSearch}
            modeFilter={modeFilter}
            onModeFilterChange={setModeFilter}
            sort={sort}
            onSortChange={setSort}
          />
        </>
      )}

      <StructureModals
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
