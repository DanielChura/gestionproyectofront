import { useDroppable } from "@dnd-kit/core";
import type { ProjectTaskState, Task } from "../../../types";
import TaskBoardCard, { type TaskCardView } from "./TaskBoardCard";
import { getIcon } from "../../../../../shared/Icons/icon-catalog";
import PlusIcon from "../../../../../shared/Icons/PlusIcon";

interface TaskBoardColumnProps {
  state: ProjectTaskState;
  tasks: Task[];
  taskById: Map<number, Task>;
  view: TaskCardView;
  isOver: boolean;
}

export default function TaskBoardColumn({
  state,
  tasks,
  taskById,
  view,
}: TaskBoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: state.code });
  const { color, icono } = state.tema!;
  const Icon = getIcon(icono);

  return (
    <section
      ref={setNodeRef}
      style={{ backgroundColor: `${color}1A` }}
      className="flex max-h-full w-70 shrink-0 flex-col gap-3 rounded-xl p-2"
    >
      <header className="flex shrink-0 items-center justify-between px-1 py-1.5">
        <span
          style={{ backgroundColor: color }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-white"
        >
          <Icon className="size-3.5" fill />
          {state.name}
        </span>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {tasks.length}
        </span>
      </header>

      <div className="board-column-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskBoardCard
            key={task.id}
            task={task}
            view={view}
            parent={
              task.parent_id != null ? taskById.get(task.parent_id) : undefined
            }
            draggable={task.permissions.state}
          />
        ))}

        <button
          type="button"
          onClick={() => view.onAction("create", 0, { stateCode: state.code })}
          style={{ color }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-current/15 dark:hover:bg-current/15"
        >
          <PlusIcon className="size-3.5" />
          <span>Añadir tarea</span>
        </button>
      </div>
    </section>
  );
}
