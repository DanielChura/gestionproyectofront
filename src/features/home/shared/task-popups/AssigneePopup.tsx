import { useState } from "react";
import type { EditTaskPayload, Project, Task } from "../../types";
import { taskAssignees } from "../../utils/taskAssignees";
import Avatar from "../../../../shared/Avatar";
import UserIcon from "../../../../shared/icons/UserIcon";
import AssigneeSelector from "../task-fields/ResponsiblePicker/AssigneeSelector";
import { usePopup } from "./usePopup";

export default function AssigneePopup({
  project,
  task,
  onPatch,
}: {
  project: Project;
  task: Task;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}) {
  const { panel, trigger, open, setOpen } = usePopup();
  const people = taskAssignees(task);
  const hasAssignees = people.length > 0;
  const [value, setValue] = useState<number[]>(() => people.map((p) => p.id));
  const disabled = !(project.permissions.manage && task.permissions.assign);

  const title = hasAssignees
    ? `Responsable: ${people.map((p) => p.name).join(", ")}`
    : "Asignar responsable";

  function handleChange(next: number[]) {
    const prev = value;
    setValue(next);
    void onPatch(task, { responsible_ids: next }).catch(() => setValue(prev));
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 p-1 text-xs hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
      >
        {hasAssignees ? (
          <>
            <Avatar
              name={people[0].name}
              className="size-5 rounded-full text-[10px]"
            />
            {people.length > 1 && <span>+{people.length - 1}</span>}
          </>
        ) : (
          <UserIcon className="size-4 text-neutral-200 dark:text-neutral-400" />
        )}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed z-50 w-72 max-w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
        >
          <AssigneeSelector
            project={project}
            value={value}
            onChange={handleChange}
          />
        </div>
      )}
    </>
  );
}
