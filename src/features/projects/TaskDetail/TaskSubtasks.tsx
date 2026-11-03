import { useRef, useState } from "react";
import type {
  SubtaskPage,
  Project,
  ProjectCatalogs,
  Task,
  TaskIdentity,
} from "../types";
import { PriorityLabel, StateIcon } from "../TaskList/TaskCell";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import QuickTaskRow from "../TaskList/QuickTaskRow";
import Tooltip from "../../../shared/Tooltip";
import { avatarFor } from "../../../shared/Avatar";
import { taskAssignees } from "../taskAssignees";

function isSubtaskFinished(task: Task) {
  return task.state_category
    ? task.state_category === "done" || task.state_category === "closed"
    : task.state_code === "COMPLETADA";
}

export default function TaskSubtasks({
  target,
  task,
  project,
  catalogs,
  page,
  loading,
  error,
  retry,
  onNavigate,
  onCreated,
  onBusyChange,
  moreBusy,
  loadMore,
}: {
  target: TaskIdentity;
  task: Task;
  project: Project;
  catalogs: ProjectCatalogs;
  page: SubtaskPage | null;
  loading: boolean;
  error: string;
  retry: () => void;
  onNavigate: (target: TaskIdentity) => void;
  onCreated: (task: Task) => void;
  onBusyChange: (busy: boolean) => void;
  moreBusy: boolean;
  loadMore: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true),
    [hideClosed, setHideClosed] = useState(false),
    [quick, setQuick] = useState(false);
  const add = useRef<HTMLButtonElement>(null);
  const tasks = Array.from(
    new Map((page?.items ?? []).map((item) => [item.id, item])).values(),
  );
  const visible = tasks.filter(
    (item) => !hideClosed || !isSubtaskFinished(item),
  );
  const next = page?.next_cursor;
  const completed = page?.completed ?? 0,
    total = page?.total ?? 0;
  return (
    <section aria-label="Subtareas" className="my-7 min-w-0 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-neutral-300 pb-3 dark:border-neutral-700">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`detail-${task.id}-subtasks`}
          className="flex cursor-pointer items-center gap-2 rounded-lg py-2 text-sm "
          onClick={() => setOpen(!open)}
        >
          <span className={open ? "rotate-90" : ""}>
            <ChevronDownIcon className="size-4 -rotate-90" />
          </span>{" "}
          Subtareas{" "}
          <span className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
            Completadas: {completed} de {total}
          </span>
        </button>
        <progress
          max={total || 1}
          value={completed}
          aria-label={`${completed} de ${total} subtareas completadas`}
          className="h-1.5 w-24 rounded-full accent-neutral-800 dark:accent-neutral-200"
        />
      </div>
      <div id={`detail-${task.id}-subtasks`} hidden={!open}>
        {loading && (
          <p role="status" className="text-xs text-neutral-600">
            Cargando subtareas…
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}{" "}
            <button
              type="button"
              onClick={retry}
              className="cursor-pointer underline"
            >
              Reintentar
            </button>
          </p>
        )}
        {!loading && !error && !total && (
          <p className="py-3 text-xs text-neutral-600">
            Esta tarea aún no tiene subtareas.
          </p>
        )}
        {!loading && !error && total > 0 && !visible.length && (
          <p className="py-3 text-xs text-neutral-600">
            No hay subtareas visibles en esta página con el filtro actual.
          </p>
        )}
        <ul className="m-0 list-none p-0">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-wrap items-center gap-2 border-b border-neutral-200 py-2 dark:border-neutral-800"
            >
              <span
                aria-label={`Estado: ${item.state_name}`}
                title={item.state_name}
              >
                <StateIcon
                  code={item.state_code}
                  name={item.state_name}
                  category={item.state_category}
                  color={item.state_color}
                />
              </span>
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer break-words rounded-lg py-1 text-left text-xs text-neutral-800 hover:underline dark:text-neutral-100"
                onClick={() =>
                  onNavigate({ projectId: target.projectId, taskId: item.id })
                }
              >
                {item.name}
              </button>
              <div className="flex max-w-36 flex-wrap gap-1">
                {taskAssignees(item).map((person) => (
                  <Tooltip
                    key={person.id}
                    label={person.name}
                    portalTarget="dialog"
                  >
                    {(description) => (
                      <span
                        tabIndex={0}
                        aria-label={person.name}
                        aria-describedby={description}
                        className="inline-grid size-7 place-items-center rounded-full bg-sky-700 text-xs  text-white"
                      >
                        {avatarFor(person.name)}
                      </span>
                    )}
                  </Tooltip>
                ))}
              </div>
              <div className="text-xs">
                <PriorityLabel
                  priority={item.priority}
                  name={
                    catalogs.priorities.find(
                      (priority) => priority.code === item.priority,
                    )?.name ?? "Sin prioridad"
                  }
                />
              </div>
            </li>
          ))}
        </ul>
        {next != null && (
          <button
            type="button"
            disabled={moreBusy}
            className="my-2 cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs"
            onClick={() => {
              void loadMore();
            }}
          >
            {moreBusy ? "Cargando…" : "Cargar más subtareas"}
          </button>
        )}
        {quick ? (
          <QuickTaskRow
            key={task.id}
            parent={task}
            project={project}
            catalogs={catalogs}
            onCreated={onCreated}
            onBusyChange={onBusyChange}
            onClose={(returnFocus = true) => {
              setQuick(false);
              if (returnFocus)
                requestAnimationFrame(() =>
                  add.current?.focus({ preventScroll: true }),
                );
            }}
          />
        ) : (
          task.permissions.create_child && (
            <button
              ref={add}
              type="button"
              className="my-2 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50"
              onClick={() => setQuick(true)}
            >
              + Añadir tarea
            </button>
          )
        )}
        {completed > 0 && (
          <button
            type="button"
            className="mt-2 cursor-pointer rounded-lg py-2 text-xs text-neutral-600 hover:text-neutral-800"
            aria-pressed={hideClosed}
            onClick={() => setHideClosed(!hideClosed)}
          >
            {hideClosed ? "Mostrar" : "Ocultar"} subtareas cerradas ({completed}
            )
          </button>
        )}
      </div>
    </section>
  );
}
