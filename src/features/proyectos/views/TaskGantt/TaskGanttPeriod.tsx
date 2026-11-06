import { useState } from "react";
import type { useTaskGantt } from "./useTaskGantt";
import type { GanttScale } from "./ganttViewport";
import { shiftGanttDay } from "./ganttViewport";
import { calendarDateKey } from "../calendarDate";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import { Calendar } from "../CreateProjectModal/ProjectEndDateSelector";
import TaskProperty from "../TaskForm/TaskProperty";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import { ganttControl } from "./GanttControl";

const choices: { id: GanttScale; label: string }[] = [
  { id: "day", label: "Día" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "quarter", label: "Trimestre" },
  { id: "year", label: "Año" },
  { id: "flexible", label: "Flexible" },
];
type Controls = ReturnType<typeof useTaskGantt>;

function PeriodChoices({
  controls,
  close,
}: {
  controls: Controls;
  close: () => void;
}) {
  const [flexible, setFlexible] = useState(
    controls.viewport.scale === "flexible",
  );
  const [first, setFirst] = useState(() =>
    calendarDateKey(controls.viewport.start),
  );
  const [last, setLast] = useState(() =>
    calendarDateKey(shiftGanttDay(controls.viewport.end, -1)),
  );
  const [error, setError] = useState("");
  return (
    <div className="grid gap-2">
      <div
        role="menu"
        aria-label="Periodos de Gantt"
        className="grid grid-cols-2 gap-1"
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
            aria-checked={controls.viewport.scale === choice.id}
            className={
              ganttControl +
              " text-left aria-checked:bg-neutral-100 dark:aria-checked:bg-neutral-800"
            }
            onClick={() => {
              if (choice.id === "flexible") {
                setFirst(
                  controls.viewport.frame?.first ??
                    calendarDateKey(controls.viewport.start),
                );
                setLast(
                  controls.viewport.frame?.last ??
                    calendarDateKey(shiftGanttDay(controls.viewport.end, -1)),
                );
                setFlexible(true);
                setError("");
              } else {
                controls.changeScale(choice.id);
                setFlexible(false);
                close();
              }
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {flexible && (
        <div className="grid gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
          <p className="m-0 text-xs text-neutral-600 dark:text-neutral-300">
            Intervalo de visualización
          </p>
          <div>
            <label htmlFor="gantt-range-first">Inicio del intervalo</label>
            <div className="flex items-center gap-1">
              <input
                id="gantt-range-first"
                name="gantt_range_first"
                type="date"
                className="[&::-webkit-calendar-picker-indicator]:hidden"
                required
                value={first}
                max={last}
                onChange={(event) => setFirst(event.target.value)}
              />
              <TaskProperty
                id="gantt-range-start"
                label="Calendario de inicio del intervalo"
                value={first ? formatTaskDate(first) : "Sin inicio"}
                compact
                content={<CalendarIcon className="size-4" />}
              >
                {(done) => (
                  <Calendar
                    value={first}
                    max={last}
                    optional={false}
                    warningBefore={null}
                    label="Inicio del intervalo"
                    onChange={setFirst}
                    close={done}
                  />
                )}
              </TaskProperty>
            </div>
          </div>
          <div>
            <label htmlFor="gantt-range-last">Fin del intervalo</label>
            <div className="flex items-center gap-1">
              <input
                id="gantt-range-last"
                name="gantt_range_last"
                type="date"
                className="[&::-webkit-calendar-picker-indicator]:hidden"
                required
                value={last}
                min={first}
                onChange={(event) => setLast(event.target.value)}
              />
              <TaskProperty
                id="gantt-range-end"
                label="Calendario de fin del intervalo"
                value={last ? formatTaskDate(last) : "Sin fin"}
                compact
                content={<CalendarIcon className="size-4" />}
              >
                {(done) => (
                  <Calendar
                    value={last}
                    min={first}
                    optional={false}
                    warningBefore={null}
                    label="Fin del intervalo"
                    onChange={setLast}
                    close={done}
                  />
                )}
              </TaskProperty>
            </div>
          </div>
          {error && (
            <p
              role="alert"
              className="m-0 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            className={
              ganttControl + " border-neutral-200 dark:border-neutral-700"
            }
            onClick={() => {
              try {
                controls.setFlexible(first, last);
                setError("");
                close();
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Revisa el intervalo.",
                );
              }
            }}
          >
            Aplicar intervalo
          </button>
        </div>
      )}
    </div>
  );
}

export default function TaskGanttPeriod({ controls }: { controls: Controls }) {
  const selected = choices.find(
    (choice) => choice.id === controls.viewport.scale,
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
            <ChevronDownIcon className="size-4" />
          </span>
        </>
      }
    >
      {(close) => <PeriodChoices controls={controls} close={close} />}
    </TaskProperty>
  );
}
