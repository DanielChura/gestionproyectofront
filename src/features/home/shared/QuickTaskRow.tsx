import CheckIcon from "../../../shared/icons/CheckIcon";
import { taskCreationStart } from "./task-fields/taskDates";
import TaskOptionalProperties from "./task-form/TaskOptionalProperties";
import type { Project, ProjectCatalogs, Task } from "../types";
import { useQuickTask } from "../views/List/hooks/useQuickTask";

interface QuickTaskRowProps {
  project: Project;
  catalogs: ProjectCatalogs;
  groupCode?: string;
  parent?: Task;
  onCreated: (task: Task) => void;
  onClose: (returnFocus?: boolean) => void;
  savingRef?: { current: boolean };
  onDetachedCreated?: (task: Task) => void;
}

export default function QuickTaskRow({
  project,
  catalogs,
  groupCode,
  parent,
  onCreated,
  onClose,
  savingRef,
  onDetachedCreated,
}: QuickTaskRowProps) {
  const draft = useQuickTask(
    project,
    groupCode,
    onCreated,
    onDetachedCreated,
    parent,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (savingRef) savingRef.current = true;
    try {
      if (await draft.save()) onClose(true);
    } finally {
      if (savingRef) savingRef.current = false;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs"
    >
      <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />

      <input
        autoFocus
        placeholder="Nombre de la tarea..."
        value={draft.name}
        onChange={(e) => draft.setName(e.target.value)}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />

      <TaskOptionalProperties
        compact
        project={project}
        catalogs={catalogs}
        responsible={draft.responsible}
        dueDate={draft.dueDate}
        min={taskCreationStart(project.start_date, parent?.start_date)}
        max={parent?.due_date ?? project.end_date ?? undefined}
        priority={draft.priority}
        labels={draft.labels}
        errors={draft.errors}
        onResponsible={draft.setResponsible}
        onDate={draft.setDueDate}
        onPriority={draft.setPriority}
        onLabels={draft.setLabels}
      />

      <button
        type="button"
        onClick={() => onClose(true)}
        className="px-2 py-1 text-neutral-500"
      >
        Cancelar
      </button>
      <button className="rounded-md bg-neutral-900 px-2.5 py-1 font-medium text-white dark:bg-white dark:text-neutral-900">
        Guardar
      </button>
    </form>
  );
}
