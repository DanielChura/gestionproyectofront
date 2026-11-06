import { useId } from "react";
import CalendarIcon from "../../../../shared/Icons/CalendarIcon";
import FlagIcon from "../../../../shared/Icons/FlagIcon";
import HashIcon from "../../../../shared/Icons/HashIcon";
import UserIcon from "../../../../shared/Icons/UserIcon";
import type {
  Label,
  Project,
} from "../../../../core/interfaces/task.interface";
import type { ProjectCatalogs } from "../../../../core/interfaces/project.interface";
import type { FieldErrors } from "../../utils/formErrors";
import ResponsiblePicker from "../task-fields/ResponsiblePicker/ResponsiblePicker";
import LabelEditor from "../task-fields/LabelEditor";
import Calendar from "../task-fields/Calendar";
import { formatTaskDate } from "../../utils/taskHierarchy";
import TaskProperty from "../task-fields/TaskProperty";
import PriorityOptions from "../task-fields/PriorityOptions";
import TaskDateValue from "../task-fields/TaskDateValue";
import { isPastTaskDate } from "../task-fields/taskDates";

export default function TaskOptionalProperties({
  project,
  catalogs,
  responsible,
  dueDate,
  priority,
  labels,
  onResponsible,
  onDate,
  onPriority,
  onLabels,
  errors,
  compact = false,
  min,
  max,
  readOnlyResponsible = "Tú",
  canAssign = project.permissions.manage,
}: {
  project: Project;
  catalogs: ProjectCatalogs;
  responsible: number[];
  dueDate: string;
  priority: number | null;
  labels: Label[];
  onResponsible: (value: number[]) => void;
  onDate: (value: string) => void;
  onPriority: (value: number | null) => void;
  onLabels: (value: Label[]) => void;
  errors: FieldErrors;
  compact?: boolean;
  min?: string;
  max?: string;
  canAssign?: boolean;
  readOnlyResponsible?: string;
}) {
  const instance = useId();
  const id = (field: string) =>
    compact ? `${instance}-${field}` : `task-${field}`;

  return (
    <>
      {canAssign ? (
        <ResponsiblePicker
          compact={compact}
          projectId={project.id}
          participants={project.participants}
          value={responsible}
          error={errors["task-responsible"]}
          onChange={onResponsible}
        />
      ) : (
        <TaskProperty
          id={id("responsible")}
          label="Responsable · Asignación administrada"
          value={
            compact
              ? "Tus tareas se asignan a ti según los permisos actuales"
              : readOnlyResponsible
          }
          icon={UserIcon}
          compact={compact}
          disabled
          content={compact ? <UserIcon className="size-4" /> : undefined}
        >
          {() => null}
        </TaskProperty>
      )}
      <TaskProperty
        id={id("due")}
        label={`Fecha límite${isPastTaskDate(dueDate) ? " · Fecha anterior a hoy" : ""}`}
        value={dueDate ? formatTaskDate(dueDate) : "Sin fecha límite"}
        icon={CalendarIcon}
        compact={compact}
        selected={Boolean(dueDate)}
        content={
          compact ? (
            <span
              className={
                isPastTaskDate(dueDate) ? "text-red-600 dark:text-red-400" : ""
              }
            >
              <CalendarIcon className="size-4" />
            </span>
          ) : (
            <>
              <CalendarIcon className="size-4" />
              <TaskDateValue value={dueDate} />
            </>
          )
        }
        error={errors["task-due"]}
      >
        {(close) => (
          <Calendar
            value={dueDate}
            min={min ?? project.start_date ?? undefined}
            max={max ?? project.end_date ?? undefined}
            label="Fecha límite"
            onChange={onDate}
            close={close}
          />
        )}
      </TaskProperty>
      <TaskProperty
        id={id("priority")}
        label="Prioridad"
        value={
          catalogs.priorities.find((item) => item.code === priority)?.name ??
          "Sin prioridad"
        }
        icon={FlagIcon}
        compact={compact}
        selected={priority !== null}
        content={compact ? <FlagIcon className="size-4" fill /> : undefined}
        error={errors["task-priority"]}
      >
        {(close) => (
          <PriorityOptions
            priorities={catalogs.priorities}
            value={priority}
            onChange={(value) => {
              onPriority(value);
              close();
            }}
          />
        )}
      </TaskProperty>
      <TaskProperty
        id={id("labels")}
        label="Etiquetas"
        value={
          labels.length ? `${labels.length} seleccionadas` : "Sin etiquetas"
        }
        icon={HashIcon}
        compact={compact}
        selected={labels.length > 0}
        content={compact ? <HashIcon className="size-4" /> : undefined}
        error={errors["task-labels"]}
      >
        {() => (
          <LabelEditor
            title="Etiquetas de la tarea"
            compact
            labels={labels}
            onChange={onLabels}
            specialties={catalogs.specialties}
          />
        )}
      </TaskProperty>
    </>
  );
}
