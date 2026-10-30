import { useCallback, useMemo, useRef } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import type { Task } from "../types";
import { ganttRange, toGanttRows } from "./ganttCalendar";
import { bindGanttReadOnly } from "./ganttReadOnly";

export function useTaskGantt(tasks: Task[]) {
  const rows = useMemo(() => toGanttRows(tasks), [tasks]);
  const range = useMemo(() => ganttRange(rows), [rows]);
  const widget = useRef<IApi | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const attach = useCallback((api: IApi | null) => {
    cleanup.current?.();
    cleanup.current = null;
    widget.current = api;
    if (api) cleanup.current = bindGanttReadOnly(api);
  }, []);
  const toggleBranch = useCallback((id: number, expanded: boolean) => {
    void widget.current?.exec("open-task", { id, mode: expanded });
  }, []);
  return { rows, range, attach, toggleBranch };
}
