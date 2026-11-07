import { useState } from "react";
import FolderIcon from "../../../shared/Icons/FolderIcon";
import EditIcon from "../../../shared/Icons/EditIcon";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import { useAreas } from "./useAreas";
import EmptyState from "../../../shared/EmptyState/EmptyState";
import {
  createArea,
  updateArea,
} from "../../../core/services/organizationService";
import type {
  Area,
  AreaWriteData,
} from "../../../core/interfaces/organization.interface";
import AreaForm from "./AreaForm/AreaForm";
import Button from "../../../shared/Button/Button";

type AreaModal = { mode: "create" } | { mode: "edit"; area: Area };

const emptyArea: AreaWriteData = { code: "", name: "", active: true };

function AreasSection() {
  const { data, refetch } = useAreas();
  const [modal, setModal] = useState<AreaModal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData: AreaWriteData) => {
    if (modal == null) return;
    setSubmitting(true);
    try {
      if (modal.mode === "edit") {
        await updateArea(modal.area.id, formData);
      } else {
        await createArea(formData);
      }
      refetch();
      setModal(null);
    } catch (e) {
      console.error("Error saving area:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="Áreas" className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">
          Áreas
        </h3>
        <Button
          type="button"
          onClick={() => setModal({ mode: "create" })}
          aria-label="Nueva área"
          className="inline-flex items-center gap-1.5"
        >
          <PlusIcon className="size-4" />
          <span>Nueva área</span>
        </Button>
      </div>

      {!Array.isArray(data) ? (
        <EmptyState iconName="areas" message="No hay áreas registradas." />
      ) : data.length === 0 ? (
        <EmptyState iconName="areas" message="No hay áreas registradas." />
      ) : (
        <ul className="m-0 p-0 list-none space-y-0.5">
          {data.map((area) => (
            <li
              key={area.id}
              className="px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="inline-flex items-center text-yellow-400"
                  aria-hidden="true"
                >
                  <FolderIcon className="size-4" />
                </span>
                <span className="text-neutral-800 dark:text-neutral-100 truncate">
                  {area.name}
                </span>
                <span className="px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded ">
                  {area.code}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 rounded-lg cursor-pointer inline-flex items-center"
                  onClick={() => setModal({ mode: "edit", area })}
                  aria-label={`Editar ${area.name}`}
                >
                  <EditIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal != null && (
        <AreaForm
          key={modal.mode === "edit" ? modal.area.id : "new"}
          title={modal.mode === "edit" ? "Editar área" : "Nueva área"}
          submitLabel={modal.mode === "edit" ? "Guardar cambios" : "Crear"}
          initialData={
            modal.mode === "edit"
              ? {
                  code: modal.area.code,
                  name: modal.area.name,
                  active: modal.area.active,
                }
              : emptyArea
          }
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

export default AreasSection;
