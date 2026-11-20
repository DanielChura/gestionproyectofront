import type { ComponentType } from "react";
import CircleDotIcon from "../../../../shared/icons/CircleDotIcon";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import UserIcon from "../../../../shared/icons/UserIcon";
import FlagIcon from "../../../../shared/icons/FlagIcon";
import HashIcon from "../../../../shared/icons/HashIcon";
import TaskCell from "../TaskCell";
import { priorityTones } from "../../../../shared/priorityTones";
import type {
  Project,
  ProjectCatalogs,
  Task,
  TaskPatchPayload,
  TaskStatePayload,
} from "../../types";

type PropertyField =
  | "state_code"
  | "start_date"
  | "due_date"
  | "responsible_id"
  | "priority"
  | "labels";

interface PropertyItem {
  field: PropertyField;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const leftFields: PropertyItem[] = [
  { field: "state_code", label: "Estado", icon: CircleDotIcon },
  { field: "start_date", label: "Fecha de inicio", icon: CalendarIcon },
  { field: "due_date", label: "Fecha límite", icon: CalendarIcon },
];

const rightFields: PropertyItem[] = [
  { field: "responsible_id", label: "Asignados", icon: UserIcon },
  { field: "priority", label: "Prioridad", icon: FlagIcon },
  { field: "labels", label: "Etiquetas", icon: HashIcon },
];

interface TaskPropertiesGridProps {
  task: Task;
  parent?: Task;
  project: Project;
  catalogs: ProjectCatalogs;
  onPatch: (task: Task, data: TaskPatchPayload) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}

export default function TaskPropertiesGrid({
  task,
  parent,
  project,
  catalogs,
  onPatch,
  onState,
}: TaskPropertiesGridProps) {
  function renderProperty({ field, label, icon: Icon }: PropertyItem) {
    const isState = field === "state_code";
    const isPriority = field === "priority";
    const priorityColorClass =
      isPriority && task.priority
        ? (priorityTones[task.priority]?.text ?? "text-neutral-400")
        : "text-neutral-400 dark:text-neutral-500";

    return (
      <div
        key={field}
        className="flex items-center gap-2 rounded-md px-2 py-1 "
      >
        <div className="flex w-32 shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span
            className={`flex items-center ${priorityColorClass}`}
            style={
              isState && task.state_tema?.color
                ? { color: task.state_tema.color }
                : undefined
            }
          >
            <Icon className="size-4 shrink-0" />
          </span>
          <span className="text-neutral-500 dark:text-neutral-400">
            {label}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <TaskCell
            appearance="detail"
            field={field}
            task={task}
            parent={parent}
            project={project}
            catalogs={catalogs}
            onPatch={onPatch}
            onState={onState}
          />
        </div>
      </div>
    );
  }

  return (
    <section className="grid grid-cols-2 gap-x-6 gap-y-1 border-y border-neutral-200 py-2 pb-4 dark:border-neutral-800">
      <div className="space-y-1">{leftFields.map(renderProperty)}</div>
      <div className="space-y-1">{rightFields.map(renderProperty)}</div>
    </section>
  );
}
