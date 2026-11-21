import { themeColor, themeIcon } from "../../../utils/themePresentation";
import { createElement } from "react";
import { useDroppable } from "@dnd-kit/core";
import type {
  ProjectTaskState,
  Task,
  TaskGroupingMode,
  TaskListGroup,
} from "../../../types";
import TaskBoardCard, { type TaskCardView } from "./TaskBoardCard";
import { getIcon } from "../../../../../shared/icons/icon-catalog";
import PlusIcon from "../../../../../shared/icons/PlusIcon";
import FlagIcon from "../../../../../shared/icons/FlagIcon";
import UserIcon from "../../../../../shared/icons/UserIcon";
import HashIcon from "../../../../../shared/icons/HashIcon";
import CalendarIcon from "../../../../../shared/icons/CalendarIcon";
import { priorityTones } from "../../../../../shared/priorityTones";

interface TaskBoardColumnProps {
  group: TaskListGroup;
  state?: ProjectTaskState;
  mode: TaskGroupingMode;
  tasks: Task[];
  taskById: Map<number, Task>;
  view: TaskCardView;
  isOver: boolean;
  droppable: boolean;
  canCreate: boolean;
}

export default function TaskBoardColumn({
  group,
  state,
  mode,
  tasks,
  taskById,
  view,
  isOver,
  droppable,
  canCreate,
}: TaskBoardColumnProps) {
  const { setNodeRef } = useDroppable({
    id: group.stateCode ?? group.key,
    disabled: !droppable,
  });
  const color = themeColor(state?.tema?.color) ?? "#737373";
  const GroupIcon =
    mode === "priority"
      ? FlagIcon
      : mode === "assignees"
        ? UserIcon
        : mode === "labels"
          ? HashIcon
          : CalendarIcon;

  return (
    <section
      ref={setNodeRef}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
      className={`flex max-h-full w-70 shrink-0 flex-col gap-2 rounded-xl p-2 ${isOver ? "ring-2 ring-inset ring-neutral-400" : ""}`}
    >
      <header className="flex min-w-0 shrink-0 items-center gap-4 px-1 py-1.5">
        {state ? (
          <span
            style={{ backgroundColor: color }}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-100"
          >
            {createElement(getIcon(themeIcon(state.tema?.icono)), {
              className: "size-3.5 shrink-0",
              fill: true,
            })}
            <span className="truncate">{group.name}</span>
          </span>
        ) : (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            <GroupIcon
              className={`size-3.5 shrink-0 ${
                mode === "priority"
                  ? (priorityTones[group.priority ?? 0]?.text ??
                    "text-neutral-500 dark:text-neutral-400")
                  : ""
              }`}
              fill={mode === "priority"}
            />
            <span className="truncate">{group.name}</span>
          </span>
        )}
        <span
          className="shrink-0 text-sm font-medium text-neutral-600 dark:text-neutral-300"
          style={state?.tema ? { color } : undefined}
        >
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
            draggable={mode === "state"}
            dragPrefix={mode === "state" ? undefined : group.key}
          />
        ))}

        {canCreate && state && (
          <button
            type="button"
            onClick={() =>
              view.onAction("create", 0, { stateCode: state.code })
            }
            style={{ color }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-current/15 dark:hover:bg-current/15"
          >
            <PlusIcon className="size-4" />
            <span>Añadir tarea</span>
          </button>
        )}
      </div>
    </section>
  );
}
