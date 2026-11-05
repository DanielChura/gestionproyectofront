import type { FormEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { errorText } from "../../../auth/api";
import LabelList from "../LabelList";
import TaskStatusConfiguration from "../task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import type { FieldErrors } from "../../utils/formErrors";
import { apiFieldErrors } from "../../utils/formErrors";
import { labelSelection } from "../../utils/labelSelection";
import { taskAssignees } from "../../utils/taskAssignees";
import type {
  EditTaskPayload,
  Label,
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskFormPayload,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
import TaskProperties from "./TaskProperties";
import { taskCreationStart } from "../task-fields/taskDates";

interface TaskFormProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onClose: () => void;
  onCheckCreation?: () => Promise<unknown>;
}

const taskFields: Record<string, string> = {
  name: "task-name",
  description: "task-description",
  state_code: "task-initial-state",
  due_date: "task-due",
  start_date: "task-start",
  specialty_ids: "task-labels",
  retained_label_ids: "task-labels",
  priority: "task-priority",
  responsible_id: "task-responsible",
  responsible_ids: "task-responsible",
  reason: "task-reason",
  labels: "task-labels",
  requirement_ids: "task-labels",
};

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
}: TaskFormProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [stateCode, setStateCode] = useState(
    initialState ??
      project.task_states.states.find(
        (state) =>
          state.category === "not_started" ||
          (!state.category && state.code === "PENDIENTE"),
      )?.code ??
      "PENDIENTE",
  );
  const [priority, setPriority] = useState<number | null>(
    task ? task.priority : 3,
  );
  const creationMin = taskCreationStart(project.start_date, parent?.start_date);
  const [dueDate, setDueDate] = useState(() => {
    const value = task
      ? (task.due_date ?? "")
      : (parent?.due_date ?? project.end_date ?? "");
    return !task && value && value < creationMin ? "" : value;
  });
  const [startDate, setStartDate] = useState(task?.start_date ?? creationMin);
  const [responsible, setResponsible] = useState<number[]>(
    task ? taskAssignees(task).map((person) => person.id) : [],
  );
  const [labels, setLabels] = useState<Label[]>(task?.labels ?? []);
  const [reason, setReason] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertainCreation, setUncertainCreation] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const form = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef(false),
    submitting = useRef(false);
  const canAssign =
    project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const lastDate = parent?.due_date ?? project.end_date;

  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    pendingFocus.current = false;
    const invalid = form.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]:not(:disabled)',
    );
    (
      invalid ??
      form.current?.querySelector<HTMLElement>("[data-general-error]")
    )?.focus();
  }, [fieldErrors, error, busy]);

  function clearError(id: string) {
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([field]) => field !== id),
      ),
    );
  }

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertainCreation) return;
    pendingFocus.current = true;
    setError("");
    const invalid: FieldErrors = {};
    if (!name.trim()) invalid["task-name"] = "Indica el nombre de la tarea.";
    if (!task && startDate < creationMin) {
      invalid["task-start"] = "Las tareas nuevas deben iniciar hoy o después.";
    }
    if (!task && dueDate && dueDate < creationMin) {
      invalid["task-due"] =
        "La fecha límite de una tarea nueva no puede preceder a hoy.";
    }
    if (
      !startDate ||
      (project.start_date && startDate < project.start_date) ||
      (lastDate && startDate > lastDate)
    ) {
      invalid["task-start"] =
        "El inicio debe quedar dentro del periodo permitido.";
    }
    if (
      dueDate &&
      ((startDate && dueDate < startDate) || (lastDate && dueDate > lastDate))
    ) {
      invalid["task-due"] =
        "La fecha límite debe quedar dentro del periodo permitido.";
    }
    if (
      priority !== null &&
      !catalogs.priorities.some((item) => item.code === priority)
    ) {
      invalid["task-priority"] = "Selecciona una prioridad del catálogo.";
    }
    if (
      !task &&
      ["BLOQUEADA", "CANCELADA"].includes(stateCode) &&
      !reason.trim()
    ) {
      invalid["task-reason"] = "Indica un motivo para este estado.";
    }
    if (Object.keys(invalid).length > 0) {
      setFieldErrors(invalid);
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    setFieldErrors({});
    const data: EditTaskPayload = {
      name: name.trim(),
      priority,
      due_date: dueDate || null,
      start_date: startDate,
      ...labelSelection(labels),
    };
    if (!task || project.permissions.manage) {
      data.description = description.trim();
    }
    if (canAssign) data.responsible_ids = responsible;
    try {
      await onSubmit(
        task
          ? data
          : {
              ...data,
              state_code: stateCode,
              parent_id: parent?.id ?? null,
              reason: reason.trim(),
            },
      );
    } catch (failure) {
      const uncertain = !task;
      if (uncertain) setUncertainCreation(true);
      const fields = apiFieldErrors(failure, taskFields);
      setFieldErrors(fields);
      setError(
        uncertain
          ? "No se pudo confirmar la creación. Conserva este borrador y consulta las tareas antes de volver a crear; no se repetirá el envío."
          : Object.keys(fields).length
            ? ""
            : errorText(failure),
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!configuration.states.some((state) => state.code === stateCode)) {
      setStateCode(
        configuration.states.find(
          (state) =>
            state.category === "not_started" ||
            (!state.category && state.code === "PENDIENTE"),
        )?.code ?? "",
      );
    }
    onConfigured(configuration);
  }

  return (
    <>
      <form
        ref={form}
        className="flex min-h-0 flex-col text-neutral-800 dark:text-neutral-100"
        noValidate
        autoComplete="off"
        aria-busy={busy}
        onSubmit={submit}
      >
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4 max-sm:p-4">
          <fieldset
            className="m-0 grid min-w-0 gap-4 border-0 p-0"
            disabled={busy}
          >
            <p className="m-0 text-xs text-neutral-500 dark:text-neutral-400">
              {project.name}
              {parent && ` · Subtarea de ${parent.name}`}
            </p>
            <div className="grid min-w-0 gap-1">
              <label className="sr-only" htmlFor="task-name">
                Nombre de tarea obligatorio
              </label>
              <input
                id="task-name"
                name="name"
                data-initial-focus
                className="w-full rounded-lg border-b border-neutral-200 bg-transparent px-1 py-1.5 text-lg font-medium text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none aria-invalid:border-red-600 dark:border-neutral-700 dark:text-neutral-100"
                required
                maxLength={180}
                value={name}
                aria-invalid={Boolean(fieldErrors["task-name"])}
                aria-describedby={
                  fieldErrors["task-name"] ? "task-name-error" : undefined
                }
                placeholder="Nombre de tarea…"
                onChange={(event) => {
                  setName(event.target.value);
                  clearError("task-name");
                }}
              />
              {fieldError("task-name")}
            </div>
            <div className="grid min-w-0 gap-1">
              <label className="sr-only" htmlFor="task-description">
                Descripción (opcional)
              </label>
              <textarea
                id="task-description"
                name="description"
                rows={3}
                maxLength={10000}
                value={description}
                className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none aria-invalid:border-red-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                aria-invalid={Boolean(fieldErrors["task-description"])}
                aria-describedby={
                  fieldErrors["task-description"]
                    ? "task-description-error"
                    : undefined
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
            <TaskProperties
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
            {labels.length > 0 && (
              <div aria-label="Etiquetas seleccionadas">
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
              <p className="m-0 text-xs text-neutral-500">
                Se creará pendiente y asignada a ti.
              </p>
            )}
            {canAssign && project.participants.length === 0 && (
              <p className="m-0 text-xs text-neutral-500">
                Sin participantes elegibles. Puedes crearla pendiente y
                asignarla posteriormente.
              </p>
            )}
            {!task && ["BLOQUEADA", "CANCELADA"].includes(stateCode) && (
              <div className="grid min-w-0 gap-1">
                <label
                  htmlFor="task-reason"
                  className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Motivo obligatorio
                </label>
                <input
                  id="task-reason"
                  name="reason"
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 aria-invalid:border-red-600 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  required
                  maxLength={500}
                  value={reason}
                  aria-invalid={Boolean(fieldErrors["task-reason"])}
                  aria-describedby={
                    fieldErrors["task-reason"] ? "task-reason-error" : undefined
                  }
                  onChange={(event) => {
                    setReason(event.target.value);
                    clearError("task-reason");
                  }}
                />
                {fieldError("task-reason")}
              </div>
            )}
          </fieldset>
        </div>
        <footer className="shrink-0 border-t border-neutral-200 bg-white px-6 py-3 max-sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
          {error && (
            <p
              className="mb-2 text-xs text-red-600 dark:text-red-400"
              role="alert"
              tabIndex={-1}
              data-general-error
            >
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 max-sm:flex-wrap">
            <p className="m-0 text-xs text-neutral-500">
              {task
                ? `Creada el ${new Date(task.created_at).toLocaleString("es-PE")}`
                : "La fecha de creación se registra al guardar."}
            </p>
            <div className="flex shrink-0 items-center gap-2 max-sm:ml-auto">
              <button
                type="button"
                className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
                disabled={busy}
              >
                {busy
                  ? "Guardando…"
                  : task
                    ? "Guardar cambios"
                    : parent
                      ? "Crear subtarea"
                      : "Crear tarea"}
              </button>
            </div>
          </div>
        </footer>
      </form>
      {configuring && canConfigure && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configured}
          onClose={() => setConfiguring(false)}
        />
      )}
    </>
  );
}
