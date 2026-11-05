import StateIcon from "../../../../shared/task-status/StateIcon";
import type { ProjectTaskState } from "../../../../types";

export function StateLabel({ code, name, category, color }: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300"
    >
      <StateIcon code={code} name={name} category={category} color={color} />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StateBadge({ code, name, category, color }: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-100"
      style={{ backgroundColor: color ?? "#737373" }}
    >
      <StateIcon code={code} name={name} category={category} color="#fff" />
      <span className="truncate">{name}</span>
    </span>
  );
}
