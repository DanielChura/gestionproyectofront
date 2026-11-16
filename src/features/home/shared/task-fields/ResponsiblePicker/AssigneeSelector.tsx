import type { Project } from "../../../../../core/interfaces/task.interface";
import { avatarFor } from "../../../../../shared/avatarUtils";
import SuccessIcon from "../../../../../shared/icons/SuccessIcon";
import UserIcon from "../../../../../shared/icons/UserIcon";

export default function AssigneeSelector({
  project,
  value,
  onChange,
}: {
  project: Pick<Project, "participants">;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  function toggle(id: number) {
    const numId = Number(id);
    const current = value.map(Number);
    onChange(
      current.includes(numId)
        ? current.filter((item) => item !== numId)
        : [...current, numId],
    );
  }

  const numericValues = value.map(Number);
  const none = numericValues.length === 0;

  return (
    <div className="grid w-full gap-0.5">
      <button
        type="button"
        className={
          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs " +
          (none
            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800")
        }
        onClick={() => onChange([])}
      >
        <UserIcon className="size-4 shrink-0 text-neutral-400" />
        <span className="flex-1 truncate">Sin responsable</span>
        {none && <SuccessIcon className="size-3.5 shrink-0" />}
      </button>
      {project.participants.map((person) => {
        const selected = numericValues.includes(Number(person.id));
        return (
          <button
            type="button"
            key={person.id}
            className={
              "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs " +
              (selected
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800")
            }
            onClick={() => toggle(person.id)}
          >
            <span className="inline-grid size-5 shrink-0 place-items-center rounded-full bg-sky-700 text-[10px] text-neutral-100">
              {avatarFor(person.name)}
            </span>
            <span className="min-w-0 flex-1 truncate">{person.name}</span>
            {selected && <SuccessIcon className="size-3.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}