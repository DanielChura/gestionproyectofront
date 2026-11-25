import StatePopup from "../task-popups/StatePopup";
import PriorityPopup from "../task-popups/PriorityPopup";
import AssigneePopup from "../task-popups/AssigneePopup";
import DueDatePopup from "../task-popups/DueDatePopup";
import LabelPopup from "../task-popups/LabelPopup";
import type {
  Project,
  ProjectCatalogs,
  Task,
  TaskPatchPayload,
  TaskStatePayload,
} from "../../types";

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
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-neutral-200 py-3 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Estado
        </span>
        <StatePopup project={project} task={task} onState={onState} />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Asignados
        </span>
        <AssigneePopup
          project={project}
          task={task}
          onPatch={onPatch}
          showName
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Prioridad
        </span>
        <PriorityPopup catalogs={catalogs} task={task} onPatch={onPatch} />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Inicio
        </span>
        <DueDatePopup
          project={project}
          task={task}
          parent={parent}
          onPatch={onPatch}
          field="start_date"
          showLabel
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Límite
        </span>
        <DueDatePopup
          project={project}
          task={task}
          parent={parent}
          onPatch={onPatch}
          field="due_date"
          showLabel
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          Etiquetas
        </span>
        <LabelPopup catalogs={catalogs} task={task} onPatch={onPatch} />
      </div>
    </div>
  );
}
