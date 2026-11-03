import type { TaskActivityEvent, TaskActivityGroup, TaskPage } from "../types";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  activityValue,
  formatActivityDate,
  formatEstimate,
} from "./detailFormat";
import { formatTaskDate } from "../TaskList/taskHierarchy";

const fields: Record<string, string> = {
  name: "el nombre",
  state_code: "el estado",
  responsibles: "los responsables",
  start_date: "la fecha de inicio",
  due_date: "la fecha límite",
  priority: "la prioridad",
  labels: "las etiquetas",
  estimated_minutes: "la duración estimada",
  position: "la posición",
};
const priorities: Record<string, string> = {
  1: "Urgente",
  2: "Alta",
  3: "Normal",
  4: "Baja",
};
function value(event: TaskActivityEvent, input: unknown) {
  if (event.field === "estimated_minutes")
    return typeof input === "number" ? formatEstimate(input) : "sin definir";
  if (event.field === "priority")
    return priorities[String(input)] ?? "sin prioridad";
  if (event.field === "start_date" || event.field === "due_date")
    return typeof input === "string" ? formatTaskDate(input) : "sin definir";
  return activityValue(input);
}

function Event({ event }: { event: TaskActivityEvent }) {
  const data =
    event.new_value && typeof event.new_value === "object"
      ? (event.new_value as Record<string, unknown>)
      : {};
  let text: ReactNode = "actualizó la tarea";
  if (event.action === "created") text = "creó esta tarea";
  if (event.action === "changed")
    text = (
      <>
        cambió {fields[event.field] ?? event.field} de{" "}
        <span className="text-neutral-700">
          {value(event, event.old_value)}
        </span>{" "}
        a{" "}
        <span className=" text-neutral-800">
          {value(event, event.new_value)}
        </span>
      </>
    );
  if (event.action === "child_created")
    text = `creó la subtarea ${activityValue(data.name)}`;
  if (event.action.startsWith("dependency_"))
    text = `${event.action.endsWith("added") ? "añadió" : "retiró"} la dependencia: ${data.direction === "blocks" ? "esta tarea bloquea" : "esta tarea está bloqueada por"} ${activityValue(data.name)}`;
  if (event.action.startsWith("relation_"))
    text = `${event.action.endsWith("added") ? "añadió" : "retiró"} la relación ${activityValue(data.name)} con ${activityValue(data.target_name)}`;
  return (
    <li className="relative grid gap-1 border-b border-neutral-200 py-3 pl-4 text-xs leading-relaxed">
      <span
        aria-hidden="true"
        className="absolute left-0 top-4 text-neutral-600"
      >
        •
      </span>
      <p className="m-0 break-words text-neutral-700">
        <span className=" text-neutral-800">{event.actor_name}</span> {text}.
      </p>
      <time dateTime={event.created_at} className="text-xs text-neutral-600">
        {formatActivityDate(event.created_at)}
      </time>
    </li>
  );
}

export default function TaskActivity({
  page,
  loading,
  error,
  retry,
  moreBusy,
  loadMore,
  id,
  visible = true,
}: {
  page: TaskPage<TaskActivityGroup> | null;
  loading: boolean;
  error: string;
  retry: () => void;
  moreBusy: boolean;
  loadMore: () => Promise<void>;
  id?: string;
  visible?: boolean;
}) {
  const panel = useRef<HTMLElement>(null),
    position = useRef(0);
  useLayoutEffect(() => {
    if (visible && panel.current) panel.current.scrollTop = position.current;
  }, [visible]);
  const groups = Array.from(
    new Map((page?.items ?? []).map((group) => [group.id, group])).values(),
  ).sort((a, b) => a.events[0].id - b.events[0].id);
  const next = page?.next_cursor;
  return (
    <aside
      ref={panel}
      id={id}
      hidden={!visible}
      inert={!visible}
      onScroll={(event) => {
        if (visible) position.current = event.currentTarget.scrollTop;
      }}
      aria-label="Activity"
      className="min-h-0 min-w-0 overflow-y-auto overscroll-contain border-l border-neutral-300 bg-neutral-50 max-md:shrink-0 max-md:overflow-visible max-md:border-l-0 max-md:border-t dark:border-neutral-700 dark:bg-neutral-900"
    >
      <h2 className="sticky top-0 z-1 m-0 border-b border-neutral-200 bg-white px-5 py-4 text-base  dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
        Activity
      </h2>
      <div className="px-5 pb-5" aria-live="polite">
        {loading && (
          <p role="status" className="text-xs text-neutral-600">
            Cargando actividad…
          </p>
        )}
        {error && (
          <div role="alert" className="py-3 text-xs text-red-700">
            {error}{" "}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={retry}
            >
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && !groups.length && (
          <p className="py-4 text-xs leading-relaxed text-neutral-600">
            No hay actividad registrada para esta tarea. No se reconstruyen
            eventos anteriores.
          </p>
        )}
        {next != null && (
          <button
            type="button"
            disabled={moreBusy}
            className="my-3 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 disabled:opacity-50"
            onClick={() => {
              void loadMore();
            }}
          >
            {moreBusy ? "Cargando…" : "Cargar actividad anterior"}
          </button>
        )}
        <ol className="m-0 list-none p-0">
          {groups.map((group) => (
            <li key={group.id}>
              <ol className="m-0 list-none p-0">
                <Event event={group.events[0]} />
              </ol>
              {group.events.length > 1 && (
                <details className="group/activity border-b border-neutral-200 py-2 text-xs text-neutral-700">
                  <summary className="cursor-pointer rounded-lg py-1 focus-visible:outline-2">
                    <span className="group-open/activity:hidden">
                      Mostrar más ({group.events.length - 1})
                    </span>
                    <span className="hidden group-open/activity:inline">
                      Ocultar ({group.events.length - 1})
                    </span>
                  </summary>
                  <ol className="m-0 list-none p-0">
                    {group.events.slice(1).map((event) => (
                      <Event event={event} key={event.id} />
                    ))}
                  </ol>
                </details>
              )}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
