import { useContext } from "react";
import type { ITask } from "@svar-ui/react-gantt";
import { GanttCalendarContext, GanttGestureContext } from "./ganttCalendarContext";

export default function TaskGanttBar({ data }: { data: ITask }) {
  const operations = useContext(GanttCalendarContext);
  const activeId = useContext(GanttGestureContext);
  const operation = operations.get(Number(data.id));
  const busy = operation?.status === "pending" || Boolean(data.gmCalendarPending);
  const blocked = operation && operation.status !== "success";
  const editable = Boolean(data.gmEditable && data.gmDueDate !== null && !blocked && !busy);
  return <span data-gantt-calendar-task={data.id} data-calendar-editable={editable || undefined}
    data-calendar-active={activeId === Number(data.id) || undefined} data-calendar-pending={busy || undefined} className="gm-gantt-bar" aria-busy={busy || undefined}>
    {editable && <span aria-hidden="true" data-gantt-calendar-mode="start" className="gm-gantt-resize gm-gantt-resize-start" />}
    <span className="gm-gantt-bar-text">{data.text}{busy ? " · Guardando…" : blocked ? " · Revisar" : ""}</span>
    {editable && <span aria-hidden="true" data-gantt-calendar-mode="end" className="gm-gantt-resize gm-gantt-resize-end" />}
  </span>;
}
