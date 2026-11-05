import { useEffect, useRef, useState } from "react";
import { errorText } from "../../../../auth/api";
import { apiFieldErrors } from "../../../utils/formErrors";
import type { FieldErrors } from "../../../utils/formErrors";
import { createTask } from "../../../../../core/services/taskService";
import type {
  Label,
  Project,
  Task,
} from "../../../../../core/interfaces/task.interface";
import { quickTaskState } from "../utils/quickTaskState";
import { labelSelection } from "../../../utils/labelSelection";

const fields = {
  name: "task-name",
  due_date: "task-due",
  priority: "task-priority",
  responsible_id: "task-responsible",
  responsible_ids: "task-responsible",
  labels: "task-labels",
  requirement_ids: "task-labels",
  specialty_ids: "task-labels",
  retained_label_ids: "task-labels",
};

export function useQuickTask(
  project: Project,
  groupCode: string | undefined,
  onCreated: (task: Task) => void,
  onDetachedCreated?: (task: Task) => void,
  parent?: Task,
) {
  const [name, setName] = useState("");
  const [responsible, setResponsible] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<number | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const pending = useRef(false);
  const active = useRef(false);
  const state = quickTaskState(project, groupCode, responsible.length > 0);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function save() {
    if (pending.current || !active.current) return false;
    if (!name.trim()) {
      setErrors({ "task-name": "Indica el nombre de la tarea." });
      return false;
    }
    if (
      !state ||
      !(parent
        ? parent.permissions.create_child
        : project.permissions.create_tasks)
    ) {
      setError(
        "No hay un estado inicial autorizado. Usa el formulario completo.",
      );
      return false;
    }
    pending.current = true;
    setBusy(true);
    setErrors({});
    setError("");
    try {
      const saved = await createTask(project.id, {
        name: name.trim(),
        state_code: state.code,
        parent_id: parent?.id ?? null,
        reason: "",
        priority,
        due_date: dueDate || null,
        ...labelSelection(labels),
        ...(project.permissions.manage ? { responsible_ids: responsible } : {}),
      });
      if (!active.current) {
        onDetachedCreated?.(saved);
        return false;
      }
      onCreated(saved);
      return true;
    } catch (failure) {
      if (active.current) {
        setErrors(apiFieldErrors(failure, fields));
        setError(errorText(failure));
      }
      return false;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }

  return {
    name,
    setName,
    responsible,
    setResponsible,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    labels,
    setLabels,
    busy,
    errors,
    error,
    state,
    save,
  };
}

