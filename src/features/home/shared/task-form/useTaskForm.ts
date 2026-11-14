import { useState } from "react";
import type { FormEvent } from "react";
import { useToast } from "../../../../hooks/useToast";
import { errorText } from "../../../auth/api";
import { labelSelection } from "../../utils/labelSelection";
import { taskAssignees } from "../../utils/taskAssignees";
import { taskCreationStart } from "../task-fields/taskDates";
import type {
  EditTaskPayload,
  Label,
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskFormPayload,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";

interface UseTaskFormParams {
  project: Project;
  catalogs: ProjectCatalogs;
  task?: Task;
  parent?: Task;
  initialState?: string;
  onSubmit: (data: TaskFormPayload) => Promise<void>;
  onConfigured: (configuration: ProjectTaskConfiguration) => void;
}

export function useTaskForm({
  project,
  catalogs,
  task,
  parent,
  initialState,
  onSubmit,
  onConfigured,
}: UseTaskFormParams) {
  const { addToast } = useToast();
  const creationMin = taskCreationStart(project.start_date, parent?.start_date);
  const lastDate = parent?.due_date ?? project.end_date;

  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [stateCode, setStateCode] = useState(
    initialState ??
      project.task_states.states.find(
        (s) =>
          s.category === "not_started" ||
          (!s.category && s.code === "PENDIENTE"),
      )?.code ??
      "PENDIENTE",
  );
  const [priority, setPriority] = useState<number | null>(task?.priority ?? 3);
  const [dueDate, setDueDate] = useState(() => {
    const value = task
      ? (task.due_date ?? "")
      : (parent?.due_date ?? project.end_date ?? "");
    return !task && value && value < creationMin ? "" : value;
  });
  const [startDate, setStartDate] = useState(task?.start_date ?? creationMin);
  const [responsible, setResponsible] = useState<number[]>(
    task ? taskAssignees(task).map((p) => p.id) : [],
  );
  const [labels, setLabels] = useState<Label[]>(task?.labels ?? []);
  const [reason, setReason] = useState("");
  const [configuring, setConfiguring] = useState(false);

  const canAssign =
    project.permissions.manage && (!task || task.permissions.assign);
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Indica el nombre de la tarea.",
      });
      return;
    }
    if (!task && startDate < creationMin) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Las tareas nuevas deben iniciar hoy o después.",
      });
      return;
    }
    if (!task && dueDate && dueDate < creationMin) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "La fecha límite no puede preceder a hoy.",
      });
      return;
    }
    if (
      !startDate ||
      (project.start_date && startDate < project.start_date) ||
      (lastDate && startDate > lastDate)
    ) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "El inicio debe quedar dentro del periodo permitido.",
      });
      return;
    }
    if (
      dueDate &&
      ((startDate && dueDate < startDate) || (lastDate && dueDate > lastDate))
    ) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "La fecha límite debe quedar dentro del periodo permitido.",
      });
      return;
    }
    if (
      priority !== null &&
      !catalogs.priorities.some((p) => p.code === priority)
    ) {
      addToast({
        icon: "alert",
        title: "Validación",
        message: "Selecciona una prioridad del catálogo.",
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
    if (!task || project.permissions.manage)
      data.description = description.trim();
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
      addToast({
        icon: "error",
        title: "Error",
        message: errorText(failure) || "No se pudo guardar la tarea.",
      });
    }
  }

  function configured(configuration: ProjectTaskConfiguration) {
    if (!configuration.states.some((s) => s.code === stateCode)) {
      setStateCode(
        configuration.states.find(
          (s) =>
            s.category === "not_started" ||
            (!s.category && s.code === "PENDIENTE"),
        )?.code ?? "",
      );
    }
    onConfigured(configuration);
  }

  function removeLabel(index: number) {
    setLabels((current) => current.filter((_, pos) => pos !== index));
  }

  const title = task
    ? "Editar datos de tarea"
    : parent
      ? "Nueva subtarea"
      : "Nueva tarea";

  return {
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
    removeLabel,
    reason,
    setReason,
    configuring,
    setConfiguring,
    configured,
    canAssign,
    canConfigure,
    creationMin,
    title,
    submit,
  };
}
