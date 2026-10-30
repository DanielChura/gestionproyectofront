import { useEffect, useRef } from "react";
import type { useTaskCalendarEdit } from "./useTaskCalendarEdit";
import { formatTaskDate } from "./TaskList/taskHierarchy";

const button = "cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700";
export type CalendarFeedbackModel = Pick<ReturnType<typeof useTaskCalendarEdit>, "problem" | "current" | "consultBusy" | "consultError" | "consult" | "useCurrent">;
export default function CalendarEditFeedback({ editor, onPrepared, busy = false, focusOnProblem = true }: { editor: CalendarFeedbackModel; onPrepared?: () => void; busy?: boolean; focusOnProblem?: boolean }) {
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (editor.problem && focusOnProblem) feedback.current?.focus(); }, [editor.problem, focusOnProblem]);
  if (!editor.problem) return null;
  const messages = {
    revision: "El calendario cambió desde que abriste la edición. Tu borrador se conserva.",
    key: "La clave ya identifica otro contenido. No se ha aplicado este borrador.",
    expired: "La intención caducó. Consulta las fechas antes de preparar una edición nueva.",
    pending: "Esta intención aún no tiene un éxito confirmado. Conserva la clave al reintentar.",
    ambiguous: "No se pudo confirmar el resultado. Si conservas el borrador, Reintentar mantiene la misma intención. Cambiar su contenido prepara otra intención con la revisión original.",
  };
  return <div ref={feedback} tabIndex={-1} data-general-error className="my-2 grid gap-2 text-xs text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700" aria-live="polite">
    <p role="alert" className="m-0">{messages[editor.problem]}</p>
    <button type="button" className={`${button} justify-self-start`} disabled={busy || editor.consultBusy} onClick={() => { void editor.consult(); }}>{editor.consultBusy ? "Consultando…" : "Consultar fechas vigentes"}</button>
    {editor.consultError && <p role="alert" className="m-0 text-red-700">{editor.consultError}</p>}
    {editor.current && <div className="grid gap-2">
      <p className="m-0">Inicio vigente: {formatTaskDate(editor.current.start_date)}. Límite vigente: {formatTaskDate(editor.current.due_date)}. Revisión {editor.current.calendar_revision}.</p>
      {editor.problem !== "pending" && <><p className="m-0">El borrador se conserva. Preparar una intención nueva no guarda; revisa los campos y pulsa Guardar.</p><button type="button" className={`${button} justify-self-start`} disabled={busy || editor.consultBusy} onClick={() => { editor.useCurrent(); onPrepared?.(); }}>Preparar nueva intención sobre esta revisión</button></>}
    </div>}
  </div>;
}
