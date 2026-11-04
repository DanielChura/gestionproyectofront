import { useEffect, useRef, useState } from "react";
import { calendarProblem } from "../useTaskCalendarEdit";
import { errorText } from "../../auth/api";
import { apiFieldErrors } from "../formErrors";
import type { FieldErrors } from "../formErrors";
import { createTask } from "../services";
import type { Label, Project, Task } from "../types";
import { quickTaskState } from "./quickTaskState";
import { labelSelection } from "../labelSelection";

const fields = { name: "task-name", due_date: "task-due", priority: "task-priority", responsible_id: "task-responsible",
  responsible_ids: "task-responsible", labels: "task-labels", requirement_ids: "task-labels", specialty_ids: "task-labels", retained_label_ids: "task-labels" };

export function useQuickTask(project: Project, groupCode: string | undefined, onCreated: (task: Task) => void,
  onDetachedCreated?: (task: Task) => void, parent?: Task) {
  const [name, setName] = useState("");
  const [responsible, setResponsible] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<number | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const pending = useRef(false), ambiguous = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const active = useRef(false);
  const state = quickTaskState(project, groupCode, responsible.length > 0);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function save() {
    if (pending.current || ambiguous.current || !active.current) return false;
    if (!name.trim()) { setErrors({ "task-name": "Indica el nombre de la tarea." }); return false; }
    if (!state || !(parent ? parent.permissions.create_child : project.permissions.create_tasks)) { setError("No hay un estado inicial autorizado. Usa el formulario completo."); return false; }
    pending.current = true;
    setBusy(true); setErrors({}); setError("");
    try {
      const saved = await createTask(project.id, {
        name: name.trim(), state_code: state.code, parent_id: parent?.id ?? null, reason: "",
        priority, due_date: dueDate || null, ...labelSelection(labels),
        ...(project.permissions.manage ? { responsible_ids: responsible } : {}),
      });
      if (!active.current) { onDetachedCreated?.(saved); return false; }
      onCreated(saved);
      return true;
    } catch (failure) {
      if (active.current) {
        setErrors(apiFieldErrors(failure, fields));
        if (calendarProblem(failure) === "ambiguous") { ambiguous.current = true; setUncertain(true); }
        setError(ambiguous.current ? "No se pudo confirmar la creación. Conserva el borrador y consulta las tareas; no se repetirá el envío." : errorText(failure));
      }
      return false;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }
  return { name, setName, responsible, setResponsible, dueDate, setDueDate, priority, setPriority, labels, setLabels, busy, errors, error, uncertain, state, save };
}
