import { useEffect, useRef, useState } from "react";
import type { Task, TaskFormPayload } from "../../types";
import { useTaskCalendarEdit } from "../../utils/useTaskCalendarEdit";
import { useTaskSync } from "../../utils/useTaskSync";
export function useTaskEdit(
  task: Task | undefined,
  onUpdated: (task: Task) => void,
  onClose: () => void,
) {
  const editor = useTaskCalendarEdit(task),
    sync = useTaskSync(),
    alive = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function save(values: TaskFormPayload) {
    if (!task) return;
    setBusy(true);
    try {
      await editor.save(values, async (payload) => {
        const saved = await sync.patch(task.id, payload);
        if (sync.isCurrent()) onUpdated(saved);
      });
      if (alive.current && sync.isCurrent()) onClose();
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return { editor, busy, save };
}
