import { useEffect, useRef, useState } from "react";
import Avatar from "../../../../../../../shared/Avatar";
import UserIcon from "../../../../../../../shared/Icons/UserIcon";
import AssigneeSelector from "../../../../../shared/task-fields/ResponsiblePicker/AssigneeSelector";
import { taskAssignees } from "../../../../../utils/taskAssignees";
import type { TaskFieldView } from "../types";

export default function TaskAssigneeCell({ view }: { view: TaskFieldView }) {
  const { task, project, onPatch } = view;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const people = taskAssignees(task);
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    people.map((p: { id: number }) => p.id),
  );

  useEffect(() => {
    setSelectedIds(taskAssignees(task).map((p: { id: number }) => p.id));
  }, [task]);

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleChange = (next: number[]) => {
    setSelectedIds(next);
    void onPatch(task, { responsible_ids: next });
  };

  return (
    <td className="h-12 px-1.5">
      <div ref={container} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {people.length > 0 ? (
            <span className="flex items-center gap-1">
              {people
                .slice(0, 3)
                .map((person: { id: number; name: string }) => (
                  <Avatar key={person.id} name={person.name} />
                ))}
              {people.length > 3 && (
                <span className="text-[10px] text-neutral-500">
                  +{people.length - 3}
                </span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-neutral-400">
              <UserIcon className="size-4" />
              <span>Sin asignar</span>
            </span>
          )}
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
            <AssigneeSelector
              project={project}
              value={selectedIds}
              onChange={handleChange}
            />
          </div>
        )}
      </div>
    </td>
  );
}
