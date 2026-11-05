import { useId } from "react";
import type { Project } from "../../../../../core/interfaces/task.interface";
import TaskProperty from "../TaskProperty";
import UserIcon from "../../../../../shared/icons/UserIcon";
import AssigneeSelector from "./AssigneeSelector";

export default function ResponsiblePicker({
  projectId,
  participants,
  teams,
  value,
  onChange,
  error,
  compact,
}: {
  projectId: number;
  participants: Project["participants"];
  teams?: Project["assignment_teams"];
  value: number[];
  onChange: (value: number[]) => void;
  error?: string;
  compact?: boolean;
}) {
  const instance = useId();
  const id = compact ? `${instance}-responsible` : "task-responsible";
  const selected = participants.filter((worker) => value.includes(worker.id));

  return (
    <TaskProperty
      id={id}
      label="Responsables"
      icon={UserIcon}
      error={error}
      compact={compact}
      selected={value.length > 0}
      content={compact ? <UserIcon className="size-4" /> : undefined}
      value={
        value.length
          ? selected.map((person) => person.name).join(", ") ||
            "Responsables no disponibles"
          : "Sin persona asignada"
      }
    >
      {(close) => (
        <>
          <AssigneeSelector
            project={{ id: projectId, participants, assignment_teams: teams }}
            value={value}
            onChange={onChange}
          />
          <button
            type="button"
            className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200"
            onClick={close}
          >
            Listo
          </button>
        </>
      )}
    </TaskProperty>
  );
}
