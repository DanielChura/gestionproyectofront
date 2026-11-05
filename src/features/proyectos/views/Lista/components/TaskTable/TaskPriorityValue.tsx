import FlagIcon from "../../../../../../shared/icons/FlagIcon";
import { priorityTones } from "../../../../shared/task-fields/priorityTones";

export default function TaskPriorityValue({
  priority,
  name,
}: {
  priority?: number | null;
  name: string;
}) {
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-neutral-700 dark:text-neutral-300"
      data-priority={priority}
    >
      <FlagIcon
        className={`size-4 shrink-0 ${priorityTones[priority ?? 0] ?? "text-neutral-500 dark:text-neutral-400"}`}
        fill
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
