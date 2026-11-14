import type { useTaskGantt } from "./useTaskGantt";
import type { GanttScale } from "./ganttViewport";
import { normalizeGanttScale } from "./ganttViewport";
import TaskProperty from "../../shared/task-fields/TaskProperty";
import { ganttControl } from "./GanttControl";
import ChevronIcon from "../../../../shared/icons/ChevronIcon";

const choices: { id: GanttScale; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Año" },
];
type Controls = ReturnType<typeof useTaskGantt>;
function PeriodChoices({
  controls,
  close,
}: {
  controls: Controls;
  close: () => void;
}) {
  const scale = normalizeGanttScale(controls.viewport.scale);
  return (
    <div
      role="menu"
      aria-label="Periodos de Gantt"
      className="grid gap-1"
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="menuitemradio"]',
          ),
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.focus();
      }}
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="menuitemradio"
          aria-checked={scale === choice.id}
          className={
            ganttControl +
            " text-left aria-checked:bg-neutral-100 dark:aria-checked:bg-neutral-800"
          }
          onClick={() => {
            controls.changeScale(choice.id);
            close();
          }}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
export default function TaskGanttPeriod({ controls }: { controls: Controls }) {
  const selected = choices.find(
    (choice) => choice.id === normalizeGanttScale(controls.viewport.scale),
  )!;
  return (
    <TaskProperty
      id="gantt-period"
      label="Periodo de Gantt"
      value={selected.label}
      compact
      cell
      appearance="toolbar"
      triggerClassName={ganttControl + " inline-flex items-center gap-1.5"}
      content={
        <>
          <span>{selected.label}</span>
          <span aria-hidden="true">
            <ChevronIcon className="size-4" />
          </span>
        </>
      }
    >
      {(close) => <PeriodChoices controls={controls} close={close} />}
    </TaskProperty>
  );
}
