import CalendarEditFeedback from "../../shared/CalendarEditFeedback";
import { scheduleLabel } from "../../utils/taskSchedule";
import { formatTaskDate } from "../../utils/taskHierarchy";
import type { useGanttCalendar } from "./useGanttCalendar";
import type { GanttCalendarOperation } from "./ganttCalendarOperations";
import { ganttControl } from "./GanttControl";

export default function GanttCalendarProposal({
  calendar,
  operation,
  onClose,
}: {
  calendar: ReturnType<typeof useGanttCalendar>;
  operation: GanttCalendarOperation;
  onClose: () => void;
}) {
  return (
    <section
      aria-label={"Calendario de " + operation.name}
      className="grid gap-4 p-3 text-xs"
      aria-busy={operation.status === "pending"}
    >
      <p className="m-0">
        Propuesta{" "}
        {operation.proposal.schedule?.precision === "hour"
          ? scheduleLabel(operation.proposal)
          : `${formatTaskDate(operation.proposal.start_date)} — ${formatTaskDate(operation.proposal.due_date)}`}
      </p>
      {operation.error && (
        <p role="alert" className="m-0 text-red-700 dark:text-red-300">
          {operation.error}
        </p>
      )}
      <CalendarEditFeedback
        focusOnProblem={false}
        busy={operation.status === "pending"}
        editor={{
          problem: operation.problem,
          current: operation.current,
          consultBusy: operation.consulting,
          consultError: operation.consultError,
          consult: () => calendar.operations.consult(operation.id),
          useCurrent: () => calendar.operations.prepare(operation.id),
        }}
      />
      <div className="flex flex-wrap gap-2">
        {operation.status === "prepared" && (
          <button
            type="button"
            className={ganttControl}
            onClick={() => calendar.operations.savePrepared(operation.id)}
          >
            Guardar propuesta
          </button>
        )}
        {operation.status === "error" &&
          (operation.problem === "ambiguous" ||
            operation.problem === "pending") && (
            <button
              type="button"
              className={ganttControl}
              disabled={operation.consulting || !operation.current}
              onClick={() => calendar.operations.retry(operation.id)}
            >
              Reintentar misma intención
            </button>
          )}
        {operation.status !== "pending" &&
          operation.problem !== "pending" &&
          (operation.problem !== "ambiguous" || operation.current) && (
            <button
              type="button"
              className={ganttControl}
              disabled={operation.consulting}
              onClick={() => {
                calendar.operations.discard(operation.id);
                onClose();
              }}
            >
              Descartar propuesta
            </button>
          )}
      </div>
    </section>
  );
}
