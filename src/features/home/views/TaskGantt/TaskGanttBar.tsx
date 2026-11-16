import { TaskActions } from "./ganttActionsContext";
import { useContext } from "react";
import type { CSSProperties } from "react";
import type { ITask } from "@svar-ui/react-gantt";
import {
  GanttCalendarContext,
  GanttGestureContext,
} from "./ganttCalendarContext";
export default function TaskGanttBar({ data }: { data: ITask }) {
  const { openTask: open } = useContext(TaskActions);
  const operations = useContext(GanttCalendarContext);
  const activeId = useContext(GanttGestureContext);
  const operation = operations.get(Number(data.id));
  const busy =
    operation?.status === "pending" || Boolean(data.gmCalendarPending);
  const blocked =
    operation &&
    operation.status !== "success" &&
    !(operation.status === "error" && operation.problem === null);
  const editable = Boolean(
    data.gmEditable && data.gmDueDate !== null && !blocked && !busy,
  );
  const stateColor = data.gmState?.color ?? "#737373";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        open(Number(data.id));
      }}
      aria-label={"Abrir barra de " + data.text}
      data-gantt-calendar-task={data.id}
      data-gantt-hairline={(data.$w !== undefined && data.$w < 2) || undefined}
      data-calendar-editable={editable || undefined}
      data-calendar-active={activeId === Number(data.id) || undefined}
      data-calendar-pending={busy || undefined}
      data-gantt-parent={data.gmHasChildren || undefined}
      style={{ "--gm-state-color": stateColor } as CSSProperties}
      className="gm-gantt-bar cursor-pointer"
      aria-busy={busy || undefined}
    >
      <span className="gm-gantt-bar-text sr-only">
        {data.text}
        {busy ? " · Guardando…" : blocked ? " · Revisar" : ""}
      </span>
    </button>
  );
}
