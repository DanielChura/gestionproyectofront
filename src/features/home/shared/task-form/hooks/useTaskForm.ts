import { useRef, useState, type FormEvent } from "react";
import { errorText } from "../../../../../core/api/httpClient";
import { useToast } from "../../../../../hooks/useToast";
import { labelSelection } from "../../../utils/labelSelection";
import type {
  CreateTaskPayload,
  Label,
  Project,
  ProjectTaskConfiguration,
  Task,
} from "../../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../../core/interfaces/project.interface";
import { taskCreationStart } from "../../task-fields/taskDates";

interface UseTaskFormParams {
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
  onCheckCreation?: () => Promise<unknown>;
}

export function useTaskForm({
  project,
  catalogs,
  parent,
  initialState,
  onSubmit,
  onConfigured,
  onCheckCreation,
}: UseTaskFormParams) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stateCode, setStateCode] = useState(
    initialState ??
      project.task_states.states.find(
        (state) =>
          state.category === "not_started" ||
          (!state.category && state.code === "PENDIENTE"),
      )?.code ??
      "PENDIENTE",
  );
  const [priority, setPriority] = useState<number | null>(3);
  const creationMin = taskCreationStart(project.start_date, parent?.start_date);
  const [dueDate, setDueDate] = useState(() => {
    const value = parent?.due_date ?? project.end_date ?? "";
    return value && value < creationMin ? "" : value;
  });
  const [startDate, setStartDate] = useState(creationMin);
  const [responsible, setResponsible] = useState<number[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [reason, setReason] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [uncertainCreation, setUncertainCreation] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const checking = useRef(false);
  const { addToast } = useToast();
  const canAssign = project.permissions.assign_tasks;
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const lastDate = parent?.due_date ?? project.end_date;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertainCreation) return;
    const invalid: Record<string, string> = {};
    if (!name.trim()) invalid["task-name"] = "Indica el nombre de la tarea.";
    if (startDate && startDate < creationMin) {
      invalid["task-start"] = "Las tareas nuevas deben iniciar hoy o después.";
    }
    if (dueDate && dueDate < creationMin) {
      invalid["task-due"] =
        "La fecha límite de una tarea nueva no puede preceder a hoy.";
    }
    if (
      startDate &&
      ((project.start_date && startDate < project.start_date) ||
        (lastDate && startDate > lastDate))
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
      !catalogs.priorities.some((p) => p.code === priority)
    ) {
      invalid["task-priority"] = "Selecciona una prioridad del catálogo.";
    }
    if (
      ["BLOQUEADA", "CANCELADA"].includes(stateCode) &&
      !reason.trim()
    ) {
      invalid["task-reason"] = "Indica un motivo para este estado.";
    }
    if (Object.keys(invalid).length > 0) {
      addToast({
        icon: "alert",
        title: "Revisa el formulario",
        message: Object.values(invalid).join(" · "),
      });
      return;
    }

    const payload: CreateTaskPayload = {
      name: name.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      start_date: startDate,
      ...labelSelection(labels),
      state_code: stateCode,
      reason: reason.trim(),
      parent_id: parent?.id ?? null,
      ...(canAssign && responsible.length > 0
        ? { responsible_ids: responsible.map(Number) }
        : {}),
    };
    setBusy(true);
    submitting.current = true;
    try {
      await onSubmit(payload);
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
    if (!onCheckCreation || checking.current) return;
    checking.current = true;
    try {
      await onCheckCreation();
    } finally {
      checking.current = false;
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
    uncertainCreation,
    busy,
    canAssign,
    canConfigure,
    creationMin,
    submit,
    configured,
    handleCheckCreation,
  };
}
