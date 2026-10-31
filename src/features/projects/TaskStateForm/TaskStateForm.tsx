import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../auth/api";
import type { ProjectTaskState, Task, TaskStatePayload } from "../types";
import ProjectForm from "../ProjectForm/ProjectForm";
import { fieldClass, inputClass, labelClass, primaryButtonClass } from "../ProjectForm/formClasses";

interface TaskStateFormProps {
  initialState?: string;
  fixedTarget?: boolean;
  task: Task;
  states: ProjectTaskState[];
  onSubmit: (data: TaskStatePayload) => Promise<void>;
}

export default function TaskStateForm({ task, states, onSubmit, initialState = "", fixedTarget = false }: TaskStateFormProps) {
  const [target, setTarget] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try { await onSubmit({ state_code: target }); }
    catch (failure) { setError(errorText(failure)); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <ProjectForm busy={busy} error={error} onSubmit={submit} actions={
      <button className={primaryButtonClass} disabled={busy || !target} type="submit">
        {busy ? "Guardando…" : "Cambiar estado"}
      </button>
    }>
      <div className={fieldClass}>
        <label htmlFor="task-target" className={labelClass}>Nuevo estado</label>
        <select id="task-target" required disabled={fixedTarget} value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass}>
          <option value="">Selecciona una transición</option>
          {task.transitions.map((item) => (
            <option value={item.target} key={item.target}>
              {states.find((state) => state.code === item.target)?.name ?? item.target}
            </option>
          ))}
        </select>
      </div>
      {task.transitions.length === 0 && <p className="m-0 text-xs text-neutral-600 leading-relaxed">No hay transiciones autorizadas desde el estado actual.</p>}
    </ProjectForm>
  );
}
