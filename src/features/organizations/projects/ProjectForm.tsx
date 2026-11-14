import type { ChangeEvent } from "react";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import ProjectAreaSelector from "./ProjectAreaSelector";
import { useCreateProject } from "./useCreateProject";

interface ProjectFormProps {
  projectId?: number;
  onClose: () => void;
}

export default function ProjectForm({ projectId, onClose }: ProjectFormProps) {
  const {
    name,
    setName,
    description,
    setDescription,
    mode,
    setMode,
    areaIds,
    toggleArea,
    endDate,
    setEndDate,
    areas,
    submitting,
    isEditing,
    handleSubmit,
  } = useCreateProject(projectId);

  return (
    <Form
      title={isEditing ? "Editar proyecto" : "Crear nuevo proyecto"}
      submitLabel={isEditing ? "Guardar cambios" : "Crear proyecto"}
      size="lg"
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-2 grid gap-1.5">
        <label
          htmlFor="project-name"
          className="text-xs text-neutral-800 dark:text-neutral-100"
        >
          Nombre del proyecto *
        </label>
        <Input
          id="project-name"
          value={name}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setName(event.target.value)
          }
          placeholder="Ej: Migración Cloud 2026"
          required
          autoFocus
        />
      </div>

      <div className="col-span-2 grid gap-1.5">
        <label
          htmlFor="project-description"
          className="text-xs text-neutral-800 dark:text-neutral-100"
        >
          Descripción
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setDescription(event.target.value)
          }
          rows={3}
          placeholder="Objetivos y alcance del proyecto"
          className="w-full resize-none rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-500"
        />
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="project-mode"
          className="text-xs text-neutral-800 dark:text-neutral-100"
        >
          Modo de asignación
        </label>
        <Select
          id="project-mode"
          value={mode}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            setMode(event.target.value as "available" | "assigned")
          }
        >
          <option value="available">Disponible para todos</option>
          <option value="assigned">Asignado por equipos</option>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="project-end-date"
          className="text-xs text-neutral-800 dark:text-neutral-100"
        >
          Fecha de finalización
        </label>
        <Input
          id="project-end-date"
          type="date"
          value={endDate}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setEndDate(event.target.value)
          }
        />
      </div>

      <div className="col-span-2">
        <ProjectAreaSelector
          areas={areas}
          selectedIds={areaIds}
          onToggle={toggleArea}
        />
      </div>
    </Form>
  );
}
