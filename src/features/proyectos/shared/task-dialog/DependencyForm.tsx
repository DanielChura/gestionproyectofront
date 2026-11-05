import { useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../../auth/api";
import type { Task } from "../../../../core/interfaces/task.interface";
import ProjectForm from "./ProjectForm";

interface DependencyFormProps {
  task: Task;
  tasks: Task[];
  onChange: (id: number, remove: boolean) => Promise<void>;
}

export default function DependencyForm({
  task,
  tasks,
  onChange,
}: DependencyFormProps) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const candidates = tasks.filter(
    (item) =>
      item.parent_id === null &&
      item.id !== task.id &&
      !task.dependencies.includes(item.id),
  );

  async function change(id: number, remove: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await onChange(id, remove);
      setSelected("");
      setMessage(remove ? "Dependencia retirada" : "Dependencia agregada");
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected) void change(Number(selected), false);
  }

  return (
    <ProjectForm busy={busy} error={error} onSubmit={submit}>
      <p className="m-0 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Elige una tarea que deba completarse antes de «{task.name}». El orden y
        las fechas no restringen esta selección.
      </p>
      <div className="grid min-w-0 content-start gap-1.5">
        <label
          htmlFor="dependency-source"
          className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
        >
          Tarea predecesora
        </label>
        <select
          id="dependency-source"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">Selecciona una tarea</option>
          {candidates.map((item) => (
            <option value={item.id} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <button
          className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
          disabled={busy || !selected}
          type="submit"
        >
          {busy ? "Guardando…" : "Agregar dependencia"}
        </button>
      </div>

      {task.dependencies.length > 0 && (
        <div className="grid min-w-0 content-start gap-1.5">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Dependencias actuales
          </p>
          <ul className="m-0 space-y-1.5 p-0 list-none">
            {task.dependencies.map((dependencyId) => {
              const predecessor = tasks.find((item) => item.id === dependencyId);
              return (
                <li
                  key={dependencyId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-200"
                >
                  <span className="truncate">
                    {predecessor?.name ?? `Tarea #${dependencyId}`}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void change(dependencyId, true)}
                    className="cursor-pointer text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="m-0 text-xs text-emerald-600 dark:text-emerald-400"
        >
          {message}
        </p>
      )}
    </ProjectForm>
  );
}

