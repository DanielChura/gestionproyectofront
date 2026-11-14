import { getIcon } from "../../../../../../shared/icons/icon-catalog";
import type { ProjectTaskState } from "../../../../../../core/interfaces/project.interface";

export function StateLabel({ code, name, tema, color }: ProjectTaskState) {
  const Icon = getIcon(tema?.icono);
  const tone = tema?.color ?? color;
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300"
    >
      <span
        className="inline-flex shrink-0"
        style={tone ? { color: tone } : undefined}
      >
        <Icon className="size-4" fill />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

export function StateBadge({ code, name, tema }: ProjectTaskState) {
  const Icon = getIcon(tema?.icono);
  return (
    <span
      data-state={code}
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300"
    >
      <span className="inline-flex shrink-0" style={{ color: "#fff" }}>
        <Icon className="size-4" fill />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
