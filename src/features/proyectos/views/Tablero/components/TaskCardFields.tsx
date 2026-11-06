import { useId, useState } from "react";
import type {
  EditTaskPayload,
  Label,
  Project,
  ProjectCatalogs,
  Task,
} from "../../../types";
import { formatTaskDate } from "../../../utils/taskHierarchy";
import { taskAssignees } from "../../../utils/taskAssignees";
import { labelSelection } from "../../../utils/labelSelection";
import Avatar from "../../../../../shared/Avatar";
import CalendarIcon from "../../../../../shared/Icons/CalendarIcon";
import FlagIcon from "../../../../../shared/Icons/FlagIcon";
import HashIcon from "../../../../../shared/Icons/HashIcon";
import UserIcon from "../../../../../shared/Icons/UserIcon";
import AssigneeSelector from "../../../shared/task-fields/ResponsiblePicker/AssigneeSelector";
import Calendar from "../../../shared/task-fields/Calendar";
import LabelEditor from "../../../shared/task-fields/LabelEditor";
import PriorityOptions from "../../../shared/task-fields/PriorityOptions";
import TaskDateValue from "../../../shared/task-fields/TaskDateValue";
import TaskProperty from "../../../shared/task-fields/TaskProperty";
import { priorityTones } from "../../../shared/task-fields/priorityTones";

interface TaskCardFieldsProps {
  project: Project;
  catalogs: ProjectCatalogs;
  task: Task;
  parent?: Task;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}

function AssigneeField({
  project,
  initial,
  onChange,
  onDone,
}: {
  project: Project;
  initial: number[];
  onChange: (value: number[]) => Promise<void>;
  onDone: () => void;
}) {
  const [value, setValue] = useState<number[]>(() => initial);
  return (
    <>
      <AssigneeSelector
        project={project}
        value={value}
        onChange={(next) => {
          const previous = value;
          setValue(next);
          void onChange(next).catch(() => setValue(previous));
        }}
      />
      <button
        type="button"
        className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
        onClick={onDone}
      >
        Listo
      </button>
    </>
  );
}

function LabelsField({
  initial,
  specialties,
  onChange,
  onDone,
}: {
  initial: Label[];
  specialties?: ProjectCatalogs["specialties"];
  onChange: (labels: Label[]) => Promise<void>;
  onDone: () => void;
}) {
  const [labels, setLabels] = useState<Label[]>(() => initial);
  return (
    <>
      <LabelEditor
        title="Etiquetas de la tarea"
        compact
        labels={labels}
        specialties={specialties}
        onChange={(next) => {
          const previous = labels;
          setLabels(next);
          void onChange(next).catch(() => setLabels(previous));
        }}
      />
      <button
        type="button"
        className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
        onClick={onDone}
      >
        Listo
      </button>
    </>
  );
}

export default function TaskCardFields({
  project,
  catalogs,
  task,
  parent,
  onPatch,
}: TaskCardFieldsProps) {
  const instance = useId();
  const people = taskAssignees(task);
  const responsible = people.map((person) => person.id);
  const labels = task.labels;
  const firstLabel = labels[0];
  const canAssign = project.permissions.manage && task.permissions.assign;
  const canEdit = task.permissions.edit;
  const priority = catalogs.priorities.find(
    (item) => item.code === task.priority,
  );

  return (
    <>
      <TaskProperty
        id={`${instance}-assignee`}
        board
        label="Responsable"
        value={people.map((person) => person.name).join(", ") || "Sin asignar"}
        disabled={!canAssign}
        selected={responsible.length > 0}
        content={
          people.length > 0 ? (
            <>
              <Avatar
                name={people[0].name}
                className="size-4 text-[8px]"
                aria-hidden="true"
              />
              {people.length > 1 && (
                <span className="shrink-0">+{people.length - 1}</span>
              )}
            </>
          ) : (
            <UserIcon className="size-4 shrink-0" />
          )
        }
      >
        {(close) => (
          <AssigneeField
            project={project}
            initial={responsible}
            onChange={(next) => onPatch(task, { responsible_ids: next })}
            onDone={close}
          />
        )}
      </TaskProperty>

      <TaskProperty
        id={`${instance}-due`}
        board
        label="Fecha límite"
        value={
          task.due_date ? formatTaskDate(task.due_date) : "Sin fecha límite"
        }
        disabled={!canEdit}
        selected={Boolean(task.due_date)}
        content={
          <>
            <CalendarIcon className="size-4 shrink-0" />
            {task.due_date && <TaskDateValue value={task.due_date} short />}
          </>
        }
      >
        {(close) => (
          <Calendar
            label="Fecha límite"
            value={task.due_date ?? ""}
            min={
              task.start_date ||
              parent?.start_date ||
              project.start_date ||
              undefined
            }
            max={parent?.due_date ?? project.end_date ?? undefined}
            onChange={(value) => {
              void onPatch(task, { due_date: value || null }).catch(() => {});
              close();
            }}
            close={close}
          />
        )}
      </TaskProperty>

      <TaskProperty
        id={`${instance}-priority`}
        board
        label="Prioridad"
        value={priority?.name ?? "Sin prioridad"}
        disabled={!canEdit}
        selected={task.priority !== null}
        content={
          <>
            <FlagIcon
              className={`size-4 shrink-0 ${priorityTones[task.priority ?? 0]?.text ?? "text-neutral-400 dark:text-neutral-500"}`}
              fill
            />
            {priority && (
              <span className="min-w-0 truncate">{priority.name}</span>
            )}
          </>
        }
      >
        {(close) => (
          <PriorityOptions
            priorities={catalogs.priorities}
            value={task.priority}
            onChange={(value) => {
              void onPatch(task, { priority: value }).catch(() => {});
              close();
            }}
          />
        )}
      </TaskProperty>

      <TaskProperty
        id={`${instance}-labels`}
        board
        label="Etiquetas"
        value={
          labels.length ? `${labels.length} seleccionadas` : "Sin etiquetas"
        }
        disabled={!canEdit}
        selected={labels.length > 0}
        content={
          <>
            <HashIcon className="size-4 shrink-0" />
            {firstLabel && (
              <span className="min-w-0 truncate">
                {labels.length > 1
                  ? `${firstLabel.name} +${labels.length - 1}`
                  : firstLabel.name}
              </span>
            )}
          </>
        }
      >
        {(close) => (
          <LabelsField
            initial={labels}
            specialties={catalogs.specialties}
            onChange={(next) => onPatch(task, labelSelection(next))}
            onDone={close}
          />
        )}
      </TaskProperty>
    </>
  );
}
