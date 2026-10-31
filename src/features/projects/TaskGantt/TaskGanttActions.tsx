import type { Task, TaskActionKind } from "../types";

const button = "cursor-pointer rounded-lg border border-transparent bg-transparent px-3 py-1.5 text-xs text-neutral-800 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:hover:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800";

export default function TaskGanttActions({ task, disabled = false, onOpenTask, onAction }: {
  task?: Task; disabled?: boolean; onOpenTask: (id: number, section?: "relations") => void;
  onAction?: (kind: TaskActionKind, id: number) => void;
}) {
  if (!task) return null;
  return <section aria-label="Acciones de la tarea seleccionada" className="flex flex-wrap items-center gap-2 border-b border-neutral-200 py-2 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200">
    <span className="max-w-64 truncate font-medium" title={task.name}>{task.name}</span>
    <button type="button" className={button} onClick={() => onOpenTask(task.id)}>Abrir detalle</button>
    {onAction && <>
      {task.permissions.edit && <button type="button" className={button} disabled={disabled} onClick={() => onAction("edit", task.id)}>Editar datos</button>}
      {task.permissions.state && <button type="button" className={button} disabled={disabled} onClick={() => onAction("state", task.id)}>Cambiar estado</button>}
      {task.permissions.create_child && <button type="button" className={button} disabled={disabled} onClick={() => onAction("child", task.id)}>Crear subtarea</button>}
    </>}
    {task.permissions.dependencies && <button type="button" className={button} onClick={() => onOpenTask(task.id, "relations")}>Gestionar dependencias</button>}
  </section>;
}
