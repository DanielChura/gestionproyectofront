import type { ReactNode } from "react";
import XIcon from "../../../../shared/icons/XIcon";
import LabelList from "../LabelList";
import TaskStatusConfiguration from "../task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import type {
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskFormPayload,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
import TaskProperties from "./TaskProperties";
import { useTaskForm } from "./useTaskForm";

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
  feedback,
}: TaskFormProps) {
  const form = useTaskForm({
    project,
    catalogs,
    task,
    parent,
    initialState,
    onSubmit,
    onConfigured,
  });

  return (
    <div className="bg-modal">
      <dialog
        open
        className="relative m-0 flex max-h-dvh w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-neutral-800 dark:border-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3 dark:border-neutral-900">
          <h2 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            {form.title}
          </h2>
          <button
            type="button"
            className="cursor-pointer rounded-full p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            onClick={onClose}
          >
            <XIcon className="size-4" />
          </button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.submit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 max-sm:p-4">
            <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
              {project.name}
              {parent && ` · Subtarea de ${parent.name}`}
            </p>

            <input
              className="w-full border border-neutral-200 bg-transparent px-2 py-1.5 text-lg rounded-lg placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:placeholder:text-neutral-500"
              required
              maxLength={180}
              value={form.name}
              placeholder="Escribe el Nombre de la Tarea"
              onChange={(e) => form.setName(e.target.value)}
            />

            <textarea
              rows={3}
              maxLength={10000}
              value={form.description}
              className="w-full resize-y rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-xs placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:placeholder:text-neutral-500"
              readOnly={Boolean(task && !project.permissions.manage)}
              placeholder="Añade una descripción (opcional)…"
              onChange={(e) => form.setDescription(e.target.value)}
            />

            <TaskProperties
              project={project}
              catalogs={catalogs}
              task={task}
              parent={parent}
              stateCode={form.stateCode}
              responsible={form.responsible}
              dueDate={form.dueDate}
              startDate={form.startDate}
              creationMin={task ? undefined : form.creationMin}
              onStartDate={form.setStartDate}
              priority={form.priority}
              labels={form.labels}
              errors={{}}
              onConfigure={() => form.setConfiguring(true)}
              onState={form.setStateCode}
              onResponsible={form.setResponsible}
              onDate={form.setDueDate}
              onPriority={form.setPriority}
              onLabels={form.setLabels}
            />

            {form.labels.length > 0 && (
              <LabelList labels={form.labels} onRemove={form.removeLabel} />
            )}

            {!task && !form.canAssign && (
              <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
                Se creará pendiente y asignada a ti.
              </p>
            )}

            {form.canAssign && project.participants.length === 0 && (
              <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
                Sin participantes elegibles. Puedes crearla pendiente y
                asignarla posteriormente.
              </p>
            )}

            {!task && ["BLOQUEADA", "CANCELADA"].includes(form.stateCode) && (
              <div className="grid gap-1">
                <label className="text-xs text-neutral-700 dark:text-neutral-300">
                  Motivo obligatorio
                </label>
                <input
                  className="rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs focus:border-neutral-400 focus:outline-none dark:border-neutral-700"
                  maxLength={500}
                  value={form.reason}
                  onChange={(e) => form.setReason(e.target.value)}
                />
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-neutral-200 px-6 py-3 max-sm:px-4 dark:border-neutral-900">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {task
                  ? "Guardar cambios"
                  : parent
                    ? "Crear subtarea"
                    : "Crear tarea"}
              </button>
            </div>
          </footer>
        </form>

        {feedback}
        {form.configuring && form.canConfigure && (
          <TaskStatusConfiguration
            project={project}
            onConfigured={form.configured}
            onClose={() => form.setConfiguring(false)}
          />
        )}
      </dialog>
    </div>
  );
}
