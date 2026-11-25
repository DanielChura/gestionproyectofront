import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../../../core/api/httpClient";
import Form from "../../../../shared/components/Form/Form";
import type {
  ProjectTaskState,
  Task,
  TaskStatePayload,
} from "../../../../core/interfaces/task.interface";

interface TaskStateFormProps {
  initialState?: string;
  fixedTarget?: boolean;
  task: Task;
  states: ProjectTaskState[];
  onSubmit: (data: TaskStatePayload) => Promise<void>;
  onClose: () => void;
}

export default function TaskStateForm({
  task,
  states,
  onSubmit,
  onClose,
  initialState = "",
  fixedTarget = false,
}: TaskStateFormProps) {
  const [target, setTarget] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit({ state_code: target });
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Form
      title="Cambiar estado"
      submitLabel={busy ? "Guardando…" : "Cambiar estado"}
      submitting={busy || !target}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="col-span-2 grid min-w-0 content-start gap-1.5">
        <label
          htmlFor="task-target"
          className="text-xs text-neutral-700 dark:text-neutral-300"
        >
          Nuevo estado
        </label>
        <select
          id="task-target"
          required
          disabled={fixedTarget}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
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
      {error && (
        <p className="col-span-2 m-0 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {task.transitions.length === 0 && (
        <p className="col-span-2 m-0 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          No hay transiciones autorizadas desde el estado actual.
        </p>
      )}
    </Form>
  );
}
