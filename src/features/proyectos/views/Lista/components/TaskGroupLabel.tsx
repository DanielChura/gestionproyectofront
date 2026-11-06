import UserIcon from "../../../../../shared/Icons/UserIcon";
import { getIcon } from "../../../../../shared/Icons/icon-catalog";
import type {
  ProjectTaskState,
  TaskGroupingMode,
  TaskListGroup,
} from "../../../types";
import TaskPriorityValue from "./TaskTable/TaskPriorityValue";

interface TaskGroupLabelProps {
  group: TaskListGroup;
  mode: TaskGroupingMode;
  state?: ProjectTaskState;
}

export default function TaskGroupLabel({
  group,
  mode,
  state,
}: TaskGroupLabelProps) {
  if (group.stateCode) {
    const Icon = getIcon(state?.tema?.icono);

    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-white">
        <Icon className="size-3.5" fill />
        <span className="truncate">{group.name}</span>
      </span>
    );
  }

  if (mode === "priority") {
    return <TaskPriorityValue priority={group.priority} name={group.name} />;
  }

  if (group.tokens.length) {
    return (
      <span
        className="inline-flex flex-wrap items-center gap-1.5"
        title={group.name}
      >
        {mode === "assignees" && <UserIcon className="size-4" />}
        {group.tokens.slice(0, 3).map((token) => (
          <span
            key={token.id}
            className={
              mode === "labels"
                ? "max-w-48 truncate rounded-lg px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-100"
                : "max-w-56 truncate text-xs text-neutral-800 dark:text-neutral-100"
            }
          >
            {token.name}
          </span>
        ))}
        {group.tokens.length > 3 && (
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            +{group.tokens.length - 3}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={
        group.key === "due_date:overdue"
          ? "text-xs text-red-700 dark:text-red-400"
          : "text-xs text-neutral-800 dark:text-neutral-100"
      }
    >
      {group.name}
    </span>
  );
}
