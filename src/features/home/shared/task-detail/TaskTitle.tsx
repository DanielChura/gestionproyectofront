import { useEffect, useRef, useState } from "react";
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);

  useEffect(() => {
    setValue(task.name);
  }, [task.name]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  async function handleBlur() {
    if (pending.current) return;
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.name) {
      pending.current = true;
      try {
        await onPatch({ name: trimmed });
        setEditing(false);
      } catch {
        setEditing(true);
      } finally {
        pending.current = false;
      }
    } else {
      setValue(task.name);
      setEditing(false);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
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
          aria-label={copied ? "Copiado" : "Copiar ID"}
          className="cursor-pointer rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <IdIcon className="size-4" />
        </button>

        <span className="flex items-center gap-1.5 rounded-md p-1 font-medium text-neutral-600 dark:text-neutral-400">
          <TaskListIcon className="size-4" />
          {subtasksCount} {subtasksCount === 1 ? "subtarea" : "subtareas"}
        </span>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={value}
          maxLength={180}
          rows={1}
          onChange={handleInput}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="w-full resize-none overflow-hidden rounded-md border border-neutral-300 bg-transparent px-2 py-0.5 text-lg font-medium text-neutral-800 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:text-neutral-100"
        />
      ) : (
        <h1
          onClick={() => task.permissions.edit && setEditing(true)}
          className="cursor-pointer break-words rounded-md px-2 py-0.5 text-lg font-medium text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {task.name}
        </h1>
      )}
    </div>
  );
}
