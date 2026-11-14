import AreaForm from "../Area/AreaForm/AreaForm";
import SpecialtyForm from "../Specialties/SpecialtyForm/SpecialtyForm";
import ProjectForm from "../projects/ProjectForm";
import type {
  Area,
  AreaWriteData,
  SpecialtyWriteData,
} from "../../../core/interfaces/organization.interface";

interface StructureModalsProps {
  areaModal: { mode: "create" } | { mode: "edit"; area: Area } | null;
  onCloseArea: () => void;
  onSaveArea: (data: AreaWriteData) => void;
  specialtyModal: boolean;
  onCloseSpecialty: () => void;
  onSaveSpecialty: (data: SpecialtyWriteData) => void;
  projectModal: { mode: "create" } | { mode: "edit"; projectId: number } | null;
  onCloseProject: () => void;
  submitting: boolean;
}

const emptyArea: AreaWriteData = { code: "", name: "", active: true };
const emptySpecialty: SpecialtyWriteData = { name: "" };

export default function StructureModals({
  areaModal,
  onCloseArea,
  onSaveArea,
  specialtyModal,
  onCloseSpecialty,
  onSaveSpecialty,
  projectModal,
  onCloseProject,
  submitting,
}: StructureModalsProps) {
  return (
    <>
      {areaModal && (
        <AreaForm
          title={areaModal.mode === "create" ? "Nueva área" : "Editar área"}
          submitLabel={areaModal.mode === "create" ? "Crear área" : "Guardar"}
          initialData={
            areaModal.mode === "edit"
              ? { code: areaModal.area.code, name: areaModal.area.name, active: areaModal.area.active }
              : emptyArea
          }
          submitting={submitting}
          onClose={onCloseArea}
          onSubmit={onSaveArea}
        />
      )}
      {specialtyModal && (
        <SpecialtyForm
          title="Nueva especialidad"
          submitLabel="Crear especialidad"
          initialData={emptySpecialty}
          submitting={submitting}
          onClose={onCloseSpecialty}
          onSubmit={onSaveSpecialty}
        />
      )}
      {projectModal && (
        <ProjectForm
          projectId={
            projectModal.mode === "edit" ? projectModal.projectId : undefined
          }
          onClose={onCloseProject}
        />
      )}
    </>
  );
}
