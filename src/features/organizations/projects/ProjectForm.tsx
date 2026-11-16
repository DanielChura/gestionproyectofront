import type { ChangeEvent } from "react";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import ProjectParticipantsPicker from "./ProjectParticipantsPicker";
import { useCreateProject } from "./useCreateProject";
import type { ProjectFormProps } from "./types";

export default function ProjectForm({ projectId, onClose }: ProjectFormProps) {
  const {
    name,
    setName,
    description,
    setDescription,
    areaId,
    handleAreaChange,
    endDate,
    setEndDate,
    areas,
    submitting,
    isEditing,
    handleSubmit,
    picker,
  } = useCreateProject(projectId, onClose);

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
        <label htmlFor="project-name" className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombre del proyecto *
        </label>
        <Input
          id="project-name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Ej: Migración Cloud 2026"
          required
          autoFocus
        />
      </div>

      <div className="col-span-2 grid gap-1.5">
        <label htmlFor="project-description" className="text-xs text-neutral-800 dark:text-neutral-100">
          Descripción
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          rows={2}
          placeholder="Objetivos y alcance del proyecto"
          className="w-full resize-none rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-500"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="project-area" className="text-xs text-neutral-800 dark:text-neutral-100">
          Área operativa *
        </label>
        <Select
          id="project-area"
          value={areaId ?? ""}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            handleAreaChange(e.target.value ? Number(e.target.value) : null)
          }
          required
        >
          <option value="">Selecciona un área...</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="project-end-date" className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de finalización
        </label>
        <Input
          id="project-end-date"
          type="date"
          value={endDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
        />
      </div>

      {!isEditing && <ProjectParticipantsPicker picker={picker} />}
    </Form>
  );
}
