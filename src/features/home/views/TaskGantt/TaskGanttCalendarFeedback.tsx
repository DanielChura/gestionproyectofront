import { useState } from "react";
import type { useGanttCalendar } from "./useGanttCalendar";
import GanttNotice from "./GanttNotice";
import GanttCalendarProposal from "./GanttCalendarProposal";
import Modal from "../../../../shared/components/Modal/Modal";
import { ganttControl } from "./GanttControl";

export default function TaskGanttCalendarFeedback({
  calendar,
}: {
  calendar: ReturnType<typeof useGanttCalendar>;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const active =
    selected === null ? undefined : calendar.snapshot.get(selected);
  const error = [...calendar.snapshot.values()]
    .filter((operation) => operation.status === "error")
    .at(-1);
  return (
    <section
      aria-label="Operaciones de calendario"
      className="flex flex-wrap gap-2 text-xs text-neutral-800 dark:text-neutral-200"
    >
      {error && (
        <GanttNotice
          key={error.id + ":" + error.error}
          label={"Calendario de " + error.name}
        >
          <span role="alert">{error.error}</span>
        </GanttNotice>
      )}
      {[...calendar.snapshot.values()].map((operation) => (
        <div key={operation.id}>
          {operation.problem && (
            <button
              type="button"
              className={ganttControl}
              onClick={() => setSelected(operation.id)}
            >
              Revisar propuesta de {operation.name}
            </button>
          )}
        </div>
      ))}
      {active && (
        <Modal
          title={"Propuesta de " + active.name}
          busy={active.status === "pending" || active.consulting}
          onClose={() => setSelected(null)}
        >
          <GanttCalendarProposal
            calendar={calendar}
            operation={active}
            onClose={() => setSelected(null)}
          />
        </Modal>
      )}
    </section>
  );
}
