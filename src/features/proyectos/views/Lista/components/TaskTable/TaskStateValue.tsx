import StateIcon from "../../../../shared/task-status/StateIcon";
import type { ProjectTaskState } from "../../../../../core/interfaces/project.interface";

export function StateLabel({
  code,
  name,
  category,
  tema_id,
}: ProjectTaskState) {
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300"
    >
      <StateIcon
        code={code}
        name={name}
        category={category}
        color="neutral-700"
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StateBadge({
  code,
  name,
  category,
  tema_id,
}: ProjectTaskState) {
  const color = "neutral-700";
  return (
    <span
      data-state={code}
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${color}`}
    >
      <StateIcon code={code} name={name} category={category} color="#fff" />
      <span className="truncate">{name}</span>
    </span>
  );
}
