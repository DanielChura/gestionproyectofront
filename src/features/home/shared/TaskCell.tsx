import { getIcon } from "../../../shared/icons/icon-catalog";
import { useId, useRef, useState } from "react";
import type { ComponentType } from "react";
import Avatar from "../../../shared/Avatar";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import FlagIcon from "../../../shared/icons/FlagIcon";
import SuccessIcon from "../../../shared/icons/SuccessIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import { useTaskCalendarEdit } from "../utils/useTaskCalendarEdit";
import { errorText } from "../../../core/api/httpClient";
import LabelEditor from "./task-fields/LabelEditor";
import { labelSelection } from "../utils/labelSelection";
import AssigneeSelector from "./task-fields/ResponsiblePicker/AssigneeSelector";
import {
  categoryValue,
  groupTaskStates,
  stateCategories,
} from "../utils/stateGroups";
import { taskAssignees } from "../utils/taskAssignees";
import { initialColor } from "../../../utils/initialColor";
import PriorityOptions from "./task-fields/PriorityOptions";
import { priorityTones } from "../../../shared/priorityTones";
import { isBeforeTaskCreation, taskCreationDay } from "./task-fields/taskDates";
import HashIcon from "../../../shared/icons/HashIcon";
import TaskDateValue from "./task-fields/TaskDateValue";
import StatusIcon from "../../../shared/icons/StatusIcon";
import TaskProperty from "./task-fields/TaskProperty";
import type {
  TaskPatchPayload,
  Label,
  Project,
  ProjectCatalogs,
  ProjectTaskState,
  Task,
  TaskStatePayload,
} from "../types";
import { formatTaskDate } from "../utils/taskHierarchy";
import { themeColor, themeIcon } from "../utils/themePresentation";
import CalendarEditFeedback from "./CalendarEditFeedback";
import Calendar from "./task-fields/Calendar";

const styles = {
  editor:
    "grid gap-2.5 [&_fieldset]:min-w-0 [&_fieldset]:m-0 [&_fieldset]:p-0 [&_fieldset]:[border:0] [&_textarea]:w-full [&_textarea]:p-2 [&_textarea]:border [&_textarea]:border-neutral-200 [&_textarea]:rounded-md [&_textarea]:resize-y",
  options:
    "max-h-60 overflow-y-auto [&_h3]:mt-3 [&_h3]:mx-1.5 [&_h3]:mb-[5px] [&_h3]:text-neutral-600 [&_h3]:text-[0.75rem] [&_h3]:",
  option:
    "flex items-center gap-2 w-full min-h-9 my-0.5 mx-0 py-[7px] px-2 [border:0] rounded-md   text-neutral-800 dark:text-neutral-100 dark:aria-pressed:bg-neutral-800 text-left text-[0.8125rem] cursor-pointer aria-pressed:bg-neutral-100 aria-pressed:[@media(pointer:coarse)]:min-h-11",
  check: "ml-auto",
  priority:
    "inline-flex min-w-0 max-w-full items-center gap-1.5 text-neutral-700 dark:text-neutral-300",
  editorActions:
    "flex justify-end gap-2 pt-2.5 border-t border-neutral-200 [&_button]:min-h-[34px] [&_button]:py-1.5 [&_button]:px-3 [&_button]:text-[0.8125rem] [&_button]:rounded-md [&_button]:cursor-pointer [&_button:not(.primary-button)]:  [&_button:not(.primary-button)]:text-neutral-800 dark:[&_button:not(.primary-button)]:text-neutral-200 [&_button:not(.primary-button)]:border [&_button:not(.primary-button)]:border-neutral-200",
  error:
    "m-0 text-red-700 dark:text-red-400 text-[0.75rem] [overflow-wrap:anywhere]",
};

type Field =
  | "state_code"
  | "priority"
  | "responsible_id"
  | "start_date"
  | "due_date"
  | "labels";
export interface TaskChanges {
  onPatch: (task: Task, data: TaskPatchPayload) => Promise<void>;
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
  labels: "Etiquetas",
};
const icons: Record<Field, ComponentType<{ className?: string }>> = {
  state_code: StatusIcon,
  priority: FlagIcon,
  responsible_id: UserIcon,
  start_date: CalendarIcon,
  due_date: CalendarIcon,
  labels: ({ className }) => <HashIcon className={className} />,
};

export function StateIcon({
  code,
  name,
  category,
  color,
  tema,
}: Pick<ProjectTaskState, "code" | "category" | "color" | "tema"> & {
  name?: string;
}) {
  const value = categoryValue({ code, category });
  const stateName = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("es");
  const Icon = getIcon(tema?.icono);

  const tone =
    themeColor(color ?? tema?.color) ??
    (code === "CANCELADA" || stateName === "CANCELADA"
      ? "#a42a28"
      : stateCategories.find((item) => item.value === value)?.color);
  return (
    <span
      className="inline-flex shrink-0"
      style={tone ? { color: tone } : undefined}
    >
      <Icon className="size-4" fill />
    </span>
  );
}

export function StateLabel({
  code,
  name,
  category,
  color,
  tema,
}: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs  text-neutral-700 dark:text-neutral-300"
    >
      <StateIcon
        code={code}
        name={name}
        category={category}
        color={color}
        tema={tema}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StateBadge({
  code,
  name,
  category,
  color,
  tema,
}: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs  text-neutral-100"
      style={{ backgroundColor: themeColor(tema?.color ?? color) ?? "#737373" }}
    >
      <StateIcon
        code={code}
        name={name}
        category={category}
        color="#fff"
        tema={tema}
      />
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
  const tone = priority ? priorityTones[priority] : undefined;
  return (
    <span className={styles.priority} data-priority={priority}>
      <FlagIcon
        className={`size-4 shrink-0 ${tone?.text ?? "text-neutral-400"}`}
        fill={false}
      />
      {tone ? (
        <span className="truncate">{tone.texto}</span>
      ) : (
        <span className="truncate">{name}</span>
      )}
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
  const calendarEdit = useTaskCalendarEdit(task);
  const baseTask = calendarEdit.base!;
  const [value, setValue] = useState(String(baseTask[field] ?? ""));
  const [responsibles, setResponsibles] = useState(() =>
    field === "responsible_id"
      ? taskAssignees(task).map((person) => person.id)
      : [],
  );
  const [search, setSearch] = useState("");
  const [taskLabels, setTaskLabels] = useState<Label[]>(task.labels);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
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
        await calendarEdit.save({ responsible_ids: responsibles }, (data) =>
          onPatch(task, data),
        );
      else if (field === "labels") {
        await calendarEdit.save(labelSelection(taskLabels), (data) =>
          onPatch(task, data),
        );
      } else
        await calendarEdit.save(
          {
            [field]:
              field === "priority"
                ? value
                  ? Number(value)
                  : null
                : value || null,
          },
          (data) => onPatch(task, data),
        );
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
        className={styles.option}
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
        <span className={styles.check}>
          {selected && <SuccessIcon className="size-4" />}
        </span>
      </button>
    );
  }
  return (
    <div className={styles.editor} aria-busy={busy}>
      <fieldset disabled={busy}>
        {field === "state_code" && (
          <>
            <label htmlFor={`${id}-search`}>
              {field === "state_code" ? "Buscar estado" : "Buscar por nombre"}
            </label>
            <input
              id={`${id}-search`}
              name="search"
              type="search"
              autoComplete="off"
              placeholder="Buscar…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </>
        )}
        <div
          className={field === "responsible_id" ? undefined : styles.options}
        >
          {field === "labels" && (
            <LabelEditor
              title="Etiquetas de la tarea"
              compact
              labels={taskLabels}
              onChange={setTaskLabels}
              specialties={catalogs.specialties}
            />
          )}
          {field === "state_code" &&
            groupTaskStates(states).map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
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
            warningBefore={taskCreationDay(task.created_at)}
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
      <CalendarEditFeedback
        busy={busy}
        editor={calendarEdit}
        onPrepared={() => {
          setError("");
          requestAnimationFrame(() => saveButton.current?.focus());
        }}
      />
      {error && !calendarEdit.problem && (
        <p
          ref={errorMessage}
          tabIndex={-1}
          id={`${id}-error`}
          className={styles.error}
          role="alert"
        >
          {error}
        </p>
      )}
      <div className={styles.editorActions}>
        <button type="button" disabled={busy} onClick={close}>
          Cancelar
        </button>
        <button
          type="button"
          ref={saveButton}
          className="primary-button bg-neutral-800  text-neutral-100 hover:bg-neutral-700"
          disabled={
            busy ||
            calendarEdit.blocked ||
            (field === "labels"
              ? JSON.stringify(labelSelection(taskLabels)) ===
                JSON.stringify(labelSelection(task.labels))
              : field === "responsible_id"
                ? JSON.stringify([...responsibles].sort((a, b) => a - b)) ===
                  JSON.stringify(taskAssignees(task).map((person) => person.id))
                : value === String(baseTask[field] ?? ""))
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
          : field === "labels"
            ? `${task.labels.length} etiquetas`
            : formatTaskDate(task[field]);
  const content =
    field === "state_code" ? (
      <StateBadge
        code={task.state_code}
        name={value}
        category={task.state_category}
        color={task.state_color}
        tema={task.state_tema}
      />
    ) : field === "responsible_id" && people.length > 0 ? (
      <span className="flex flex-wrap items-center gap-1">
        {people.slice(0, 3).map((person) => (
          <Avatar
            key={person.id}
            name={person.name}
            title={person.name}
            className="size-7 rounded-full text-xs"
            aria-hidden="true"
          />
        ))}
        {people.length > 3 && (
          <span className="text-xs text-neutral-700 dark:text-neutral-300">
            +{people.length - 3}
          </span>
        )}
      </span>
    ) : field === "responsible_id" ? (
      <span className="flex items-center gap-1.5">
        <UserIcon className="size-4" />
        {props.appearance === "detail"
          ? permitted
            ? "Asignar responsable"
            : "Sin persona asignada"
          : null}
      </span>
    ) : field === "labels" ? (
      task.labels.length > 0 ? (
        <span className="flex flex-wrap items-center gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className={`rounded px-1.5 py-0.5 text-xs lowercase text-neutral-100 ${initialColor(label.name)}`}
            >
              {label.name}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-neutral-700 dark:text-neutral-300">
              +{task.labels.length - 3}
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <HashIcon className="size-4" />
          {props.appearance === "detail" && (
            <span>
              {permitted ? "Añadir etiquetas" : "Sin etiquetas"}
            </span>
          )}
        </span>
      )
    ) : field === "priority" ? (
      <PriorityLabel priority={task.priority} name={value} />
    ) : (
      <>
        <CalendarIcon className="size-4" />
        <TaskDateValue value={task[field]} createdAt={task.created_at} />
      </>
    );
  return (
    <TaskProperty
      appearance={props.appearance ?? "list"}
      compact={field === "labels" && props.appearance !== "detail"}
      cell
      id={`${instanceId}-task-${task.id}-${field}`}
      label={`${props.appearance === "detail" ? labels[field] : `${labels[field]} · ${task.name}`}${(field === "start_date" || field === "due_date") && isBeforeTaskCreation(task[field], task.created_at) ? " · Fecha actual anterior al día de creación" : ""}`}
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
                    className="size-7 rounded-full text-xs"
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
      {(close) => (
        <>
          {props.appearance === "detail" &&
            !["start_date", "due_date", "labels"].includes(field) && (
              <h3 className="m-0 mb-3 text-sm ">{labels[field]}</h3>
            )}
          <Editor {...props} close={close} />
        </>
      )}
    </TaskProperty>
  );
}
