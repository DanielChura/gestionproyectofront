import { useState } from "react";
import IdIcon from "../../../../shared/icons/IdIcon";
import TaskListIcon from "../../../../shared/icons/TaskListIcon";
import type { Task, TaskPatchPayload } from "../../types";

interface TaskTitleProps {
  task: Task;
  subtasksCount?: number;
  onPatch: (patch: TaskPatchPayload) => Promise<unknown>;
}

export default function TaskTitle({
  task,
  subtasksCount = 0,
  onPatch,
}: TaskTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.name);
  const [copied, setCopied] = useState(false);

  async function handleBlur() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.name) {
      await onPatch({ name: trimmed });
    } else {
      setValue(task.name);
    }
  }

  function handleCopyId() {
    navigator.clipboard?.writeText(String(task.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <button
          type="button"
          onClick={handleCopyId}
          title={copied ? "Copiado" : "Copiar ID"}
          className="cursor-pointer rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <IdIcon className="size-4" />
        </button>

        <span className="flex items-center rounded-lg font-medium gap-1.5 cursor-pointer p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <TaskListIcon className="size-4" />
          {subtasksCount} {subtasksCount === 1 ? "subtarea" : "subtareas"}
        </span>
      </div>

      {editing ? (
        <input
          autoFocus
          value={value}
          maxLength={180}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          className="w-full bg-transparent px-2 py-0.5 text-xl font-medium text-neutral-900 outline-none dark:text-neutral-100"
        />
      ) : (
        <h1
          onClick={() => task.permissions.edit && setEditing(true)}
          className="cursor-pointer rounded-lg px-2 py-0.5 text-xl font-medium text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {task.name}
        </h1>
      )}
    </div>
  );
}
