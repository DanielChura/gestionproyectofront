import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { errorText } from "../../../auth/api";
import { useToast } from "../../../../hooks/useToast";
import type { FieldErrors } from "../../utils/formErrors";
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
import { taskCreationStart } from "../task-fields/taskDates";

interface UseTaskFormParams {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onCheckCreation?: () => Promise<unknown>;
}
const taskFields: Record<string, string> = {
  schedule: "task-schedule",
  reason: "task-reason",
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
  labels: "task-labels",
  requirement_ids: "task-labels",
};

export function useTaskForm({
  project,
  catalogs,
  task,
  parent,
  initialState,
  onSubmit,
  onConfigured,
  onCheckCreation,
}: UseTaskFormParams) {
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
  const [configuring, setConfiguring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertainCreation, setUncertainCreation] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef(false),
    submitting = useRef(false);
  const canAssign =
    project.permissions.assign_tasks && (!task || task.permissions.assign);
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const lastDate = parent?.due_date ?? project.end_date;

  useLayoutEffect(() => {
    if (busy || !pendingFocus.current) return;
    pendingFocus.current = false;
    const invalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]:not(:disabled)',
    );
    (
      invalid ??
      formRef.current?.querySelector<HTMLElement>("[data-general-error]")
    )?.focus();
  }, [fieldErrors, error, busy]);

  function clearError(id: string) {
    setFieldErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([field]) => field !== id),
      ),
    );
  }

  const [reason, setReason] = useState("");

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
    if (!task && !dueDate) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Indica la fecha límite de la tarea.",
      });
      return;
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
      priority === null ||
      !catalogs.priorities.some((p) => p.code === priority)
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
    if (
      canAssign &&
      responsible.length === 0 &&
      project.participants.length > 0
    ) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Selecciona al menos un responsable de la tarea.",
      });
      return;
    }
    if (
      !task &&
      ["BLOQUEADA", "CANCELADA"].includes(stateCode) &&
      !reason.trim()
    ) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Indica un motivo para este estado.",
      });
      return;
    }

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
    setBusy(true);
    submitting.current = true;
    try {
      await onSubmit(
        task
          ? data
          : {
              ...data,
              state_code: stateCode,
              reason: reason.trim(),
              parent_id: parent?.id ?? null,
            },
      );
    } catch (failure) {
      const status = (failure as { status?: number } | null)?.status;
      if (status === 503 || status === 0 || status === undefined) {
        setUncertainCreation(true);
      }
      addToast({
        icon: "error",
        title: "No se pudo guardar la tarea",
        message: errorText(failure) || "No se pudo guardar la tarea.",
      });
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

  async function handleCheckCreation() {
    if (!onCheckCreation || checking) return;
    setChecking(true);
    try {
      await onCheckCreation();
    } finally {
      setChecking(false);
    }
  }

  return {
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
    lastDate,
    creationMin,
    clearError,
    submit,
    configured,
    handleCheckCreation,
  };
}
