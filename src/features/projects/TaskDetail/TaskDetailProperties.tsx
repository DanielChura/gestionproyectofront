import { useEffect, useId, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { errorText } from "../../auth/api";
import type { Project, ProjectCatalogs, Task } from "../types";
import TaskCell from "../TaskList/TaskCell";
import type { TaskChanges } from "../TaskList/TaskCell";
import TaskProperty from "../TaskForm/TaskProperty";
import type { IconProps } from "../../../shared/icons/types";
import StatusIcon from "../../../shared/icons/StatusIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import FlagIcon from "../../../shared/icons/FlagIcon";
import HourglassIcon from "../../../shared/icons/HourglassIcon";
import HashIcon from "../../../shared/icons/HashIcon";
import { formatEstimate, parseEstimate } from "./detailFormat";
import { taskAssignees } from "../taskAssignees";

const action =
  "cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50";

export function TaskTitle({
  task,
  onPatch,
  disabled,
}: Pick<TaskChanges, "onPatch"> & { task: Task; disabled: boolean }) {
  const [editing, setEditing] = useState(false),
    [value, setValue] = useState(task.name),
    [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const guard = useRef(false),
    input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    restore = useRef(false);
  useEffect(() => {
    if (editing) input.current?.focus();
    else if (restore.current) {
      trigger.current?.focus();
      restore.current = false;
    }
  }, [editing]);
  const cancel = () => {
    if (!guard.current) {
      restore.current = true;
      setEditing(false);
      setError("");
      setValue(task.name);
    }
  };
  return editing ? (
    <form
      className="mb-7 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (guard.current) return;
        if (!value.trim()) {
          setError("Indica el nombre de la tarea.");
          input.current?.focus();
          return;
        }
        if (value.trim() === task.name) {
          cancel();
          return;
        }
        guard.current = true;
        setPending(true);
        void onPatch(task, { name: value.trim() })
          .then(() => {
            restore.current = true;
            setEditing(false);
            setError("");
          })
          .catch((failure) => setError(errorText(failure)))
          .finally(() => {
            guard.current = false;
            setPending(false);
          });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <label className="sr-only" htmlFor="detail-task-name">
        Nombre de la tarea
      </label>
      <input
        ref={input}
        id="detail-task-name"
        name="task_name"
        autoComplete="off"
        maxLength={180}
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "detail-name-error" : undefined}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing && event.key === "Enter")
            event.preventDefault();
        }}
        className="min-w-0 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-2xl "
      />
      {error && (
        <p
          id="detail-name-error"
          role="alert"
          className="m-0 text-xs text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={action}
          disabled={pending}
          onClick={cancel}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={`${action} bg-neutral-800 text-white hover:bg-neutral-700`}
          disabled={pending}
        >
          {pending ? "Guardando…" : "Guardar nombre"}
        </button>
      </div>
    </form>
  ) : (
    <h1 className="mb-7 mt-0 break-words text-2xl font-medium sm:text-3xl">
      <button
        ref={trigger}
        type="button"
        data-initial-focus
        className="w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left text-inherit hover:bg-neutral-50 disabled:cursor-default"
        aria-label={`Editar nombre: ${task.name}`}
        disabled={!task.permissions.edit || disabled}
        onClick={() => {
          setValue(task.name);
          setEditing(true);
        }}
      >
        {task.name}
      </button>
    </h1>
  );
}

function Property({
  label,
  Icon,
  children,
}: {
  label: string;
  Icon: ComponentType<IconProps>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex w-32 shrink-0 items-center gap-2 py-2 text-xs text-neutral-600 dark:text-neutral-400 max-sm:w-26">
        <Icon className="size-4" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function EstimateEditor({
  task,
  onPatch,
  close,
}: Pick<TaskChanges, "onPatch"> & { task: Task; close: () => void }) {
  const [value, setValue] = useState(
      task.estimated_minutes ? formatEstimate(task.estimated_minutes) : "",
    ),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  async function save(clear = false) {
    if (pending.current) return;
    let minutes: number | null;
    try {
      minutes = clear ? null : parseEstimate(value);
    } catch (failure) {
      setError((failure as Error).message);
      input.current?.focus();
      return;
    }
    if (minutes === (task.estimated_minutes ?? null)) {
      close();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await onPatch(task, { estimated_minutes: minutes });
      close();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-3" aria-busy={busy}>
      <div>
        <label
          htmlFor={id}
          className="text-base  text-neutral-800 dark:text-neutral-100"
        >
          Duración estimada
        </label>
        <p
          id={`${id}-hint`}
          className="m-0 text-sm text-neutral-600 dark:text-neutral-400"
        >
          Un día equivale a 8 horas
        </p>
      </div>
      <input
        ref={input}
        id={id}
        name="estimated_minutes"
        data-panel-focus
        type="text"
        placeholder="p. ej. 1 d 4 h"
        maxLength={80}
        autoComplete="off"
        value={value}
        disabled={busy}
        onChange={(event) => {
          setValue(event.target.value);
          setError("");
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            void save();
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="m-0 text-red-700">
          {error}
        </p>
      )}
      {task.estimated_minutes != null && (
        <button
          type="button"
          disabled={busy}
          className="justify-self-start cursor-pointer rounded-lg px-1 py-1 text-sm text-neutral-700 underline"
          onClick={() => {
            void save(true);
          }}
        >
          Quitar estimación
        </button>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          className={action}
          onClick={close}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${action} bg-neutral-800 text-white hover:bg-neutral-700`}
          onClick={() => {
            void save();
          }}
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function TaskDetailProperties({
  project,
  catalogs,
  task,
  parent,
  ...changes
}: TaskChanges & {
  project: Project;
  catalogs: ProjectCatalogs;
  task: Task;
  parent?: Task;
}) {
  const cell = (
    field:
      | "state_code"
      | "responsible_id"
      | "start_date"
      | "due_date"
      | "priority",
  ) => (
    <TaskCell
      {...changes}
      appearance="detail"
      field={field}
      project={project}
      catalogs={catalogs}
      task={task}
      parent={parent}
    />
  );
  return (
    <section
      aria-label="Propiedades de la tarea"
      className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-2 border-b border-neutral-300 pb-5 dark:border-neutral-700 max-lg:grid-cols-1"
    >
      <Property label="Estado" Icon={StatusIcon}>
        {cell("state_code")}
      </Property>
      <Property label="Asignados" Icon={UserIcon}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {cell("responsible_id")}
          {taskAssignees(task).length > 0 && (
            <span className="break-words text-sm text-neutral-800">
              {taskAssignees(task)
                .map((person) => person.name)
                .join(", ")}
            </span>
          )}
        </div>
      </Property>
      <Property label="Fechas" Icon={CalendarIcon}>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {cell("start_date")}
          <span aria-hidden="true" className="text-neutral-600">
            →
          </span>
          {cell("due_date")}
        </div>
      </Property>
      <Property label="Prioridad" Icon={FlagIcon}>
        {cell("priority")}
      </Property>
      <Property label="Duración estimada" Icon={HourglassIcon}>
        <TaskProperty
          appearance="detail"
          cell
          id={`detail-${task.id}-estimate`}
          label="Duración estimada"
          icon={HourglassIcon}
          value={formatEstimate(task.estimated_minutes)}
          content={<span>{formatEstimate(task.estimated_minutes)}</span>}
          disabled={!task.permissions.edit}
        >
          {(close) => (
            <EstimateEditor
              task={task}
              onPatch={changes.onPatch}
              close={close}
            />
          )}
        </TaskProperty>
      </Property>
    </section>
  );
}
