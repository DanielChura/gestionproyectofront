import { useId, useRef, useState } from "react";
import type { ComponentType } from "react";
import Avatar from "../../../shared/Avatar";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import CheckIcon from "../../../shared/icons/CheckIcon";
import CircleDashedIcon from "../../../shared/icons/CircleDashedIcon";
import CircleDotIcon from "../../../shared/icons/CircleDotIcon";
import CircleHalfIcon from "../../../shared/icons/CircleHalfIcon";
import CircleMinusIcon from "../../../shared/icons/CircleMinusIcon";
import FlagIcon from "../../../shared/icons/FlagIcon";

import SuccessIcon from "../../../shared/icons/SuccessIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import XIcon from "../../../shared/icons/XIcon";
import { errorText } from "../../auth/api";
import { Calendar } from "../CreateProjectModal/ProjectEndDateSelector";

import AssigneeSelector from "../ResponsiblePicker/AssigneeSelector";
import {
  categoryValue,
  groupTaskStates,
  stateCategories,
} from "../stateGroups";
import { taskAssignees } from "../taskAssignees";
import PriorityOptions from "../TaskForm/PriorityOptions";
import { priorityTones } from "../TaskForm/priorityTones";
import { isPastTaskDate } from "../TaskForm/taskDates";
import TaskDateValue from "../TaskForm/TaskDateValue";
import StatusIcon from "../../../shared/icons/StatusIcon";
import TaskProperty from "../TaskForm/TaskProperty";
import type {
  EditTaskPayload,
  Project,
  ProjectCatalogs,
  ProjectTaskState,
  Task,
  TaskStatePayload,
} from "../types";
import { formatTaskDate } from "./taskHierarchy";

type Field =
  | "state_code"
  | "priority"
  | "responsible_id"
  | "start_date"
  | "due_date";
export interface TaskChanges {
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}
interface TaskCellProps extends TaskChanges {
  appearance?: "detail";
  field: Field;
  task: Task;
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
}
const labels: Record<Field, string> = {
  state_code: "Estado",
  priority: "Prioridad",
  responsible_id: "Persona asignada",
  start_date: "Fecha de inicio",
  due_date: "Fecha límite",
};
const icons: Record<Field, ComponentType<{ className?: string }>> = {
  state_code: StatusIcon,
  priority: FlagIcon,
  responsible_id: UserIcon,
  start_date: CalendarIcon,
  due_date: CalendarIcon,
};

export function StateIcon({
  code,
  name,
  category,
  color,
}: Pick<ProjectTaskState, "code" | "category" | "color"> & { name?: string }) {
  const value = categoryValue({ code, name: "", category });
  const stateName = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("es");
  const tone =
    color ??
    (code === "CANCELADA" || stateName === "CANCELADA"
      ? "#a42a28"
      : stateCategories.find((item) => item.value === value)?.color);
  const Icon =
    code === "CANCELADA" || stateName === "CANCELADA"
      ? XIcon
      : code === "BLOQUEADA" || stateName.startsWith("BLOQUEAD")
        ? CircleMinusIcon
        : code === "EN_REVISION" || stateName.includes("REVISION")
          ? CircleHalfIcon
          : code === "EN_CURSO" ||
              stateName === "EN CURSO" ||
              stateName === "EN PROGRESO"
            ? CircleDotIcon
            : code === "PENDIENTE" || stateName === "PENDIENTE"
              ? CircleDashedIcon
              : value === "done"
                ? SuccessIcon
                : value === "closed"
                  ? CheckIcon
                  : value === "active"
                    ? CircleDotIcon
                    : CircleDashedIcon;
  return (
    <span
      className="inline-flex shrink-0"
      style={tone ? { color: tone } : undefined}
    >
      <Icon className="size-4" fill />
    </span>
  );
}

export function StateLabel({ code, name, category, color }: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs  text-neutral-700 dark:text-neutral-300"
    >
      <StateIcon code={code} name={name} category={category} color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StateBadge({ code, name, category, color }: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs  text-white"
      style={{ backgroundColor: color ?? "#737373" }}
    >
      <StateIcon code={code} name={name} category={category} color="#fff" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function PriorityLabel({
  priority,
  name,
}: {
  priority?: number | null;
  name: string;
}) {
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-neutral-700 dark:text-neutral-300"
      data-priority={priority}
    >
      <FlagIcon
        className={`size-4 shrink-0 ${priorityTones[priority ?? 0] ?? "text-neutral-500 dark:text-neutral-400"}`}
        fill
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

function Editor({
  field,
  task,
  project,
  catalogs,
  parent,
  onPatch,
  onState,
  close,
}: TaskCellProps & { close: () => void }) {
  const [value, setValue] = useState(String(task[field] ?? ""));
  const [responsibles, setResponsibles] = useState(() =>
    field === "responsible_id"
      ? taskAssignees(task).map((person) => person.id)
      : [],
  );
  const [search, setSearch] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const isDate = field === "start_date" || field === "due_date";
  const matches = (name: string) =>
    name
      .toLocaleLowerCase("es")
      .includes(search.trim().toLocaleLowerCase("es"));
  const states = project.task_states.states.filter(
    (state) =>
      matches(state.name) &&
      (state.code === task.state_code ||
        (
          task.move_targets ?? task.transitions.map((item) => item.target)
        ).includes(state.code)),
  );

  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (field === "state_code") await onState(task, { state_code: value });
      else if (field === "responsible_id")
        await onPatch(task, { responsible_ids: responsibles });
      else
        await onPatch(task, {
          [field]:
            field === "priority"
              ? value
                ? Number(value)
                : null
              : value || null,
        });
      close();
    } catch (failure) {
      setError(errorText(failure));
      requestAnimationFrame(() => errorMessage.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  function option(key: string, name: string, content = <>{name}</>) {
    const selected =
      field === "responsible_id"
        ? key === ""
          ? responsibles.length === 0
          : responsibles.includes(Number(key))
        : value === key;
    return (
      <button
        type="button"
        key={key}
        className="flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-1.5 px-2 rounded-lg text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left text-xs cursor-pointer"
        aria-pressed={selected}
        onClick={() => {
          if (field === "responsible_id")
            setResponsibles((current) =>
              key === ""
                ? []
                : current.includes(Number(key))
                  ? current.filter((id) => id !== Number(key))
                  : [...current, Number(key)],
            );
          else setValue(key);
          setError("");
        }}
      >
        {content}
        <span className="ml-auto">
          {selected && <SuccessIcon className="size-4" />}
        </span>
      </button>
    );
  }
  return (
    <div className="grid gap-2.5">
      <fieldset disabled={busy} className="grid gap-2">
        {field === "state_code" && (
          <>
            <label
              htmlFor={`${id}-search`}
              className="text-xs  text-neutral-700 dark:text-neutral-300"
            >
              {field === "state_code" ? "Buscar estado" : "Buscar por nombre"}
            </label>
            <input
              id={`${id}-search`}
              type="search"
              placeholder="Buscar…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </>
        )}
        <div
          className={
            field === "responsible_id" ? undefined : "max-h-60 overflow-y-auto"
          }
        >
          {field === "state_code" &&
            groupTaskStates(states).map((group) => (
              <section key={group.label}>
                <h3 className="mb-1 text-xs  text-neutral-600 dark:text-neutral-400">
                  {group.label}
                </h3>
                {group.states.map((state) =>
                  option(state.code, state.name, <StateLabel {...state} />),
                )}
              </section>
            ))}
          {field === "state_code" && states.length === 0 && (
            <p role="status">No hay estados que coincidan.</p>
          )}
          {field === "priority" && (
            <PriorityOptions
              priorities={catalogs.priorities}
              value={value ? Number(value) : null}
              onChange={(next) => setValue(next === null ? "" : String(next))}
            />
          )}
          {field === "responsible_id" && (
            <AssigneeSelector
              project={project}
              value={responsibles}
              onChange={setResponsibles}
            />
          )}
        </div>
        {isDate && (
          <Calendar
            value={value}
            label={labels[field]}
            optional={field === "due_date"}
            min={
              field === "due_date"
                ? task.start_date
                : (parent?.start_date ?? project.start_date ?? undefined)
            }
            max={
              field === "start_date"
                ? (task.due_date ?? undefined)
                : (parent?.due_date ?? project.end_date ?? undefined)
            }
            onChange={(next) => {
              setValue(next);
              setError("");
            }}
            close={() => undefined}
          />
        )}
      </fieldset>
      {error && (
        <p
          ref={errorMessage}
          tabIndex={-1}
          id={`${id}-error`}
          className="m-0 text-red-700 dark:text-red-400 text-xs"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2.5 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          disabled={busy}
          onClick={close}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs  text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Cancelar
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs  text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
          disabled={
            busy ||
            (field === "responsible_id"
              ? JSON.stringify([...responsibles].sort((a, b) => a - b)) ===
                JSON.stringify(taskAssignees(task).map((person) => person.id))
              : value === String(task[field] ?? ""))
          }
          onClick={() => {
            void save();
          }}
        >
          {busy ? "Guardando…" : error ? "Reintentar" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function TaskCell(props: TaskCellProps) {
  const { field, task, catalogs } = props;
  const instanceId = useId();
  const people = field === "responsible_id" ? taskAssignees(task) : [];
  const permitted =
    field === "state_code"
      ? task.permissions.state && task.transitions.length > 0
      : field === "responsible_id"
        ? task.permissions.assign
        : task.permissions.edit;
  const value =
    field === "state_code"
      ? task.state_name
      : field === "responsible_id"
        ? people.map((person) => person.name).join(", ") ||
          "Sin persona asignada"
        : field === "priority"
          ? task.priority == null
            ? "Sin prioridad"
            : (catalogs.priorities.find((item) => item.code === task.priority)
                ?.name ?? String(task.priority))
          : formatTaskDate(task[field]);
  const content =
    field === "state_code" ? (
      <StateBadge
        code={task.state_code}
        name={value}
        category={task.state_category}
        color={task.state_color}
      />
    ) : field === "responsible_id" && people.length > 0 ? (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {people.slice(0, 3).map((person) => (
          <Avatar
            key={person.id}
            name={person.name}
            title={person.name}
            aria-hidden="true"
          />
        ))}
        {people.length > 3 && (
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            +{people.length - 3}
          </span>
        )}
      </span>
    ) : field === "responsible_id" && props.appearance !== "detail" ? (
      <UserIcon className="size-4" />
    ) : field === "priority" ? (
      <PriorityLabel priority={task.priority} name={value} />
    ) : (
      <>
        {props.appearance !== "detail" && <CalendarIcon className="size-4" />}
        {field === "start_date" || field === "due_date" ? (
          <TaskDateValue value={task[field]} />
        ) : (
          <span>{value}</span>
        )}
      </>
    );
  return (
    <TaskProperty
      appearance={props.appearance ?? "list"}
      cell
      id={`${instanceId}-task-${task.id}-${field}`}
      label={`${props.appearance === "detail" ? labels[field] : `${labels[field]} · ${task.name}`}${(field === "start_date" || field === "due_date") && isPastTaskDate(task[field]) ? " · Fecha anterior a hoy" : ""}`}
      value={value}
      icon={icons[field]}
      disabled={!permitted}
      content={content}
      triggers={
        field === "responsible_id" && props.appearance === "detail"
          ? people.length
            ? people.map((person) => ({
                label: person.name,
                content: (
                  <Avatar
                    name={person.name}
                    title={person.name}
                    aria-hidden="true"
                  />
                ),
              }))
            : [
                {
                  label: "Asignar responsable",
                  content:
                    props.appearance === "detail" ? (
                      <span className="px-1 text-sm">
                        {permitted
                          ? "Asignar responsable"
                          : "Sin persona asignada"}
                      </span>
                    ) : (
                      <UserIcon className="size-4" />
                    ),
                },
              ]
          : undefined
      }
    >
      {(close) => <Editor {...props} close={close} />}
    </TaskProperty>
  );
}
