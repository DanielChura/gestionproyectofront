import type { ReactNode } from "react";
import Form from "../../../../shared/components/Form/Form";
import Button from "../../../../shared/components/Button/Button";
import { useTaskForm } from "./hooks/useTaskForm";

import LabelList from "../LabelList";
import TaskStatusConfiguration from "../task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import TaskProperties from "./TaskProperties";
import type {
  CreateTaskPayload,
  Project,
  ProjectTaskConfiguration,
  Task,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";

interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
  feedback?: ReactNode;
  onCheckCreation?: () => Promise<unknown>;
}

export default function TaskForm({
  project,
  catalogs,
  parent,
  initialState,
  onSubmit,
  onConfigured,
  onClose,
  onCheckCreation,
  feedback,
}: TaskFormProps) {
  const {
    reason,
    setReason,
    name,
    setName,
    description,
    setDescription,
    stateCode,
    setStateCode,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    startDate,
    setStartDate,
    responsible,
    setResponsible,
    labels,
    setLabels,
    configuring,
    setConfiguring,
    uncertainCreation,
    busy,
    canAssign,
    canConfigure,
    creationMin,
    submit,
    configured,
    handleCheckCreation,
  } = useTaskForm({
    project,
    catalogs,
    parent,
    initialState,
    onSubmit,
    onConfigured,
    onCheckCreation,
  });

  return (
    <>
      <Form
        title={parent ? "Nueva subtarea" : "Nueva tarea"}
        submitLabel={parent ? "Crear subtarea" : "Crear tarea"}
        size="lg"
        submitting={busy}
        onClose={onClose}
        onSubmit={submit}
      >
        <div className="col-span-2 grid min-w-0 gap-1">
          <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
            {project.name}
            {parent && ` · Subtarea de ${parent.name}`}
          </p>
          <label className="sr-only" htmlFor="task-name">
            Nombre de tarea obligatorio
          </label>
          <input
            id="task-name"
            name="name"
            data-initial-focus
            className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-lg text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            required
            maxLength={180}
            value={name}
            placeholder="Escribe el nombre de la Tarea"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="col-span-2 grid min-w-0 gap-1">
          <label className="sr-only" htmlFor="task-description">
            Descripción (opcional)
          </label>
          <textarea
            id="task-description"
            name="description"
            rows={3}
            maxLength={10000}
            value={description}
            className="w-full resize-y rounded-md border border-neutral-200 px-2 py-2 text-xs text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-neutral-100"
            placeholder="Añade una descripción (opcional)…"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        {["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
          <div className="col-span-2 grid gap-1">
            <label
              htmlFor="task-reason"
              className="text-xs text-neutral-700 dark:text-neutral-300"
            >
              Motivo obligatorio
            </label>
            <input
              id="task-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
              className="rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-xs focus:border-neutral-400 focus:outline-none dark:border-neutral-700"
            />
          </div>
        )}
        <div className="col-span-2">
          <TaskProperties
            hideCalendar={false}
            project={project}
            catalogs={catalogs}
            parent={parent}
            stateCode={stateCode}
            responsible={responsible}
            dueDate={dueDate}
            startDate={startDate}
            creationMin={creationMin}
            onStartDate={setStartDate}
            priority={priority}
            labels={labels}
            onConfigure={() => setConfiguring(true)}
            onState={setStateCode}
            onResponsible={setResponsible}
            onDate={setDueDate}
            onPriority={setPriority}
            onLabels={setLabels}
          />
        </div>
        {labels.length > 0 && (
          <div className="col-span-2" aria-label="Etiquetas seleccionadas">
            <LabelList
              labels={labels}
              onRemove={(index) =>
                setLabels((current) =>
                  current.filter((_, position) => position !== index),
                )
              }
            />
          </div>
        )}
        {!canAssign && (
          <p className="col-span-2 m-0 text-xs text-neutral-500">
            Se creará pendiente y asignada a ti.
          </p>
        )}
        {uncertainCreation && onCheckCreation && (
          <div className="col-span-2 flex justify-end">
            <Button
              variant="secondary"
              type="button"
              onClick={() => void handleCheckCreation()}
            >
              Consultar tareas creadas
            </Button>
          </div>
        )}
      </Form>
      {configuring && canConfigure && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configured}
          onClose={() => setConfiguring(false)}
        />
      )}
      {feedback}
    </>
  );
}
