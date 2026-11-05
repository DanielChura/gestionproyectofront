import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../../auth/api";
import type {
  ProjectTaskState,
  Task,
  TaskStatePayload,
} from "../../../../core/interfaces/task.interface";
import ProjectForm from "./ProjectForm";

interface TaskStateFormProps {
  initialState?: string;
  fixedTarget?: boolean;
  task: Task;
  states: ProjectTaskState[];
  onSubmit: (data: TaskStatePayload) => Promise<void>;
}

export default function TaskStateForm({
  task,
  states,
  onSubmit,
  initialState = "",
  fixedTarget = false,
}: TaskStateFormProps) {
  const [target, setTarget] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ state_code: target });
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProjectForm
      busy={busy}
      error={error}
      onSubmit={submit}
      actions={
        <button
          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
          disabled={busy || !target}
          type="submit"
        >
          {busy ? "Guardando…" : "Cambiar estado"}
        </button>
      }
    >
      <div className="grid min-w-0 content-start gap-1.5">
        <label
          htmlFor="task-target"
          className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
        >
          Nuevo estado
        </label>
        <select
          id="task-target"
          required
          disabled={fixedTarget}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">Selecciona una transición</option>
          {task.transitions.map((item) => (
            <option value={item.target} key={item.target}>
              {states.find((state) => state.code === item.target)?.name ??
                item.target}
            </option>
          ))}
        </select>
      </div>
      {task.transitions.length === 0 && (
        <p className="m-0 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          No hay transiciones autorizadas desde el estado actual.
        </p>
      )}
    </ProjectForm>
  );
}
