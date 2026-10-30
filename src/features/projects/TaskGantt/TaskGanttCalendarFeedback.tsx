import CalendarEditFeedback from "../CalendarEditFeedback";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import type { useGanttCalendar } from "./useGanttCalendar";

const button = "cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

export default function TaskGanttCalendarFeedback({ calendar }: { calendar: ReturnType<typeof useGanttCalendar> }) {
  if (!calendar.snapshot.size) return null;
  return <section aria-label="Operaciones de calendario" className="gm-gantt-feedback grid gap-2 py-3 text-xs text-neutral-800 dark:text-neutral-200">
    {[...calendar.snapshot.values()].map((operation) => <div key={operation.id} aria-label={"Calendario de " + operation.name}
      className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700" aria-busy={operation.status === "pending"}>
      <h3 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-200">{operation.name}</h3>
      <p className="my-2">Propuesta: {formatTaskDate(operation.proposal.start_date)} — {formatTaskDate(operation.proposal.due_date)}.</p>
      {operation.status === "pending" && <p role="status" className="m-0">Guardando calendario… Las demás tareas siguen disponibles.</p>}
      {operation.status === "success" && <p role="status" className="m-0">Calendario confirmado: {formatTaskDate(operation.current?.start_date)} — {formatTaskDate(operation.current?.due_date)}.</p>}
      {operation.error && <p role="alert" className="my-2 text-red-700 dark:text-red-300">{operation.error}</p>}
      <CalendarEditFeedback focusOnProblem={false} busy={operation.status === "pending"} editor={{
        problem: operation.problem, current: operation.current, consultBusy: operation.consulting, consultError: operation.consultError,
        consult: () => calendar.operations.consult(operation.id),
        useCurrent: () => calendar.operations.prepare(operation.id),
      }} />
      <div className="mt-2 flex flex-wrap gap-2">
        {operation.status === "prepared" && <button type="button" className={button} onClick={() => calendar.operations.savePrepared(operation.id)}>Guardar propuesta</button>}
        {operation.status === "error" && (operation.problem === "ambiguous" || operation.problem === "pending") &&
          <button type="button" className={button} disabled={operation.consulting} onClick={() => calendar.operations.retry(operation.id)}>Reintentar misma intención</button>}
        {operation.status !== "pending" && operation.problem !== "pending" && (operation.problem !== "ambiguous" || operation.current) &&
          <button type="button" className={button} disabled={operation.consulting} onClick={() => calendar.operations.discard(operation.id)}>{operation.status === "success" ? "Cerrar confirmación" : "Descartar propuesta"}</button>}
      </div>
    </div>)}
  </section>;
}
