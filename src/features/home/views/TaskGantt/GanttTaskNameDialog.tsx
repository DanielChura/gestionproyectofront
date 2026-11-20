import { useEffect, useRef, useState } from "react";
import Modal from "../../../../shared/components/Modal/Modal";
import { useQuickTask } from "../List/hooks/useQuickTask";
import { useTaskSync } from "../../utils/useTaskSync";
import { calendarProblem } from "../../utils/useTaskCalendarEdit";
import { errorText } from "../../../../core/api/httpClient";
import type { Task, Project } from "../../types";
import { ganttControl } from "./GanttControl";
import { getTasks } from "../../services";

export default function GanttTaskNameDialog({
  project,
  task,
  parent,
  onSaved,
  onClose,
  onConsult,
  initialStart,
}: {
  project: Project;
  initialStart?: string;
  task?: Task;
  parent?: Task;
  onSaved: (task: Task) => void;
  onClose: () => void;
  onConsult?: (tasks: Task[]) => void;
}) {
  const sync = useTaskSync();
  const quick = useQuickTask(
    project,
    undefined,
    onSaved,
    onSaved,
    parent,
    // initialStart,
  );
  const [name, setName] = useState(task?.name ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const working = busy || quick.busy;
  async function submit() {
    if (pending.current || uncertain || !name.trim()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (task) {
        const saved = await sync.patch(task.id, { name: name.trim() });
        if (alive.current && sync.isCurrent()) {
          onSaved(saved);
          onClose();
        }
      } else if (await quick.save()) onClose();
    } catch (failure) {
      if (alive.current && sync.isCurrent()) {
        setError(errorText(failure));
        setUncertain(calendarProblem(failure) === "ambiguous");
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function consult() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const tasks = await sync.read(() => getTasks(project.id));
      if (alive.current && sync.isCurrent()) {
        onConsult?.(tasks);
        if (
          task &&
          tasks.find((item) => item.id === task.id)?.name === name.trim()
        )
          onClose();
        else
          setError(
            "Consulta el resultado en las tareas antes de iniciar otra operación. El envío no se repetirá.",
          );
      }
    } catch (failure) {
      if (alive.current) setError(errorText(failure));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal
      title={
        task ? "Cambiar nombre" : parent ? "Crear subtarea" : "Crear tarea"
      }
      onClose={onClose}
      busy={working}
    >
      <form
        className="grid gap-3 p-4 text-xs"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {initialStart && (
          <p className="m-0">
            Inicio: {initialStart}.{" "}
            {[0, 6].includes(new Date(`${initialStart}T12:00:00`).getDay()) &&
              "Es fin de semana; se conserva tu elección."}
          </p>
        )}
        {parent && (
          <p
            className="m-0 truncate text-neutral-600 dark:text-neutral-300"
            title={parent.name}
          >
            {parent.name}
          </p>
        )}
        <label className="grid gap-1">
          Nombre
          <input
            data-initial-focus
            name="name"
            autoComplete="off"
            required
            maxLength={180}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              quick.setName(event.target.value);
            }}
            disabled={working || uncertain || quick.uncertain}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </label>
        {(error || quick.error || quick.errors["task-name"]) && (
          <p role="alert" className="m-0 text-red-700 dark:text-red-300">
            {error || quick.error || quick.errors["task-name"]}
          </p>
        )}
        {(uncertain || quick.uncertain) && (
          <button
            type="button"
            className={ganttControl}
            disabled={working}
            onClick={() => void consult()}
          >
            Consultar tareas
          </button>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={ganttControl}
            disabled={working}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={ganttControl + " bg-neutral-800! text-neutral-100!"}
            disabled={working || uncertain || quick.uncertain}
          >
            {working ? "Guardando…" : task ? "Guardar" : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
