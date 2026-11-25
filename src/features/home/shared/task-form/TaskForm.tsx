import type { ReactNode } from "react";
import Form from "../../../../shared/components/Form/Form";
import { useTaskForm } from "./useTaskForm";

import LabelList from "../LabelList";
import TaskStatusConfiguration from "../task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import TaskProperties from "./TaskProperties";
import type {
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskFormPayload,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
  feedback?: ReactNode;
  onCheckCreation?: () => Promise<unknown>;
}

export default function TaskForm({
  project,
  catalogs,
  task,
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
    busy,
    uncertainCreation,
    checking,
    error,
    fieldErrors,
    formRef,
    canAssign,
    canConfigure,
    creationMin,
    clearError,
    submit,
    configured,
    handleCheckCreation,
  } = useTaskForm({
    project,
    catalogs,
    task,
    parent,
    initialState,
    onSubmit,
    onConfigured,
    onCheckCreation,
  });
  function fieldError(id: string) {
    return fieldErrors[id] ? (
      <p
        id={`${id}-error`}
        className="m-0 px-1 text-xs text-red-600 dark:text-red-400"
        role="alert"
      >
        {fieldErrors[id]}
      </p>
    ) : null;
  }

  return (
    <>
      <Form
        title={
          task
            ? "Editar datos de tarea"
            : parent
              ? "Nueva subtarea"
              : "Nueva tarea"
        }
        submitLabel={
          task
            ? "Guardar cambios"
            : parent
              ? "Crear subtarea"
              : "Crear tarea"
        }
        size="lg"
        submitting={busy || uncertainCreation}
        onClose={onClose}
        onSubmit={submit}
      >
        <p className="col-span-2 m-0 text-xs text-neutral-500 dark:text-neutral-400">
          {project.name}
          {parent && ` · Subtarea de ${parent.name}`}
        </p>
        <div className="col-span-2 grid min-w-0 gap-1">
          <label className="sr-only" htmlFor="task-name">
            Nombre de tarea obligatorio
          </label>
          <input
            id="task-name"
            name="name"
            data-initial-focus
            className="w-full rounded-md border border-neutral-200 bg-transparent px-2 py-1.5 text-lg font-medium text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none aria-invalid:border-red-600 dark:border-neutral-700 dark:text-neutral-100"
            required
            maxLength={180}
            value={name}
            aria-invalid={Boolean(fieldErrors["task-name"])}
            aria-describedby={
              fieldErrors["task-name"] ? "task-name-error" : undefined
            }
            placeholder="Escribe el nombre de la Tarea"
            onChange={(event) => {
              setName(event.target.value);
              clearError("task-name");
            }}
          />
          {fieldError("task-name")}
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
            className="w-full resize-y rounded-md border border-neutral-200 px-2 py-2 text-xs text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none aria-invalid:border-red-600 dark:border-neutral-700 dark:text-neutral-100"
            aria-invalid={Boolean(fieldErrors["task-description"])}
            aria-describedby={
              fieldErrors["task-description"] ? "task-description-error" : undefined
            }
            readOnly={Boolean(task && !project.permissions.manage)}
            placeholder="Añade una descripción (opcional)…"
            onChange={(event) => {
              setDescription(event.target.value);
              clearError("task-description");
            }}
          />
          {fieldError("task-description")}
        </div>
        {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
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
              onChange={(event) => {
                setReason(event.target.value);
                clearError("task-reason");
              }}
              maxLength={500}
              required
              aria-invalid={Boolean(fieldErrors["task-reason"])}
              aria-describedby={
                fieldErrors["task-reason"] ? "task-reason-error" : undefined
              }
              className="rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-xs focus:border-neutral-400 focus:outline-none dark:border-neutral-700"
            />
            {fieldError("task-reason")}
          </div>
        )}
        <div className="col-span-2">
          <TaskProperties
            hideCalendar={false}
            project={project}
            catalogs={catalogs}
            task={task}
            parent={parent}
            stateCode={stateCode}
            responsible={responsible}
            dueDate={dueDate}
            startDate={startDate}
            creationMin={task ? undefined : creationMin}
            onStartDate={(value) => {
              setStartDate(value);
              clearError("task-start");
            }}
            priority={priority}
            labels={labels}
            errors={fieldErrors}
            onConfigure={() => setConfiguring(true)}
            onState={(value) => {
              setStateCode(value);
              clearError("task-initial-state");
            }}
            onResponsible={(value) => {
              setResponsible(value);
              clearError("task-responsible");
            }}
            onDate={(value) => {
              setDueDate(value);
              clearError("task-due");
            }}
            onPriority={(value) => {
              setPriority(value);
              clearError("task-priority");
            }}
            onLabels={(value) => {
              setLabels(value);
              clearError("task-labels");
            }}
          />
        </div>
        {labels.length > 0 && (
          <div className="col-span-2" aria-label="Etiquetas seleccionadas">
            <LabelList
              labels={labels}
              onRemove={(index) => {
                setLabels((current) =>
                  current.filter((_, position) => position !== index),
                );
                clearError("task-labels");
              }}
            />
          </div>
        )}
        {!task && !canAssign && (
          <p className="col-span-2 m-0 text-xs text-neutral-500">
            Se creará pendiente y asignada a ti.
          </p>
        )}
        {uncertainCreation && onCheckCreation && (
          <div className="col-span-2 flex justify-end">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              disabled={checking}
              onClick={() => {
                void handleCheckCreation();
              }}
            >
              {checking ? "Consultando…" : "Consultar tareas creadas"}
            </button>
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
