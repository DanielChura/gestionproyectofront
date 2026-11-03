import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import TaskProperty from "../TaskForm/TaskProperty";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import { projectToday } from "../TaskList/taskGrouping";

const navButton =
  "grid size-8 cursor-pointer place-items-center rounded-lg border border-transparent p-0 text-neutral-900 hover:enabled:border-neutral-200 disabled:cursor-default disabled:opacity-45 dark:text-neutral-100 dark:hover:enabled:border-neutral-600";
const actionButton =
  "min-h-8 cursor-pointer rounded-lg border border-neutral-200 px-2 py-1 text-xs hover:enabled:border-neutral-300 disabled:cursor-default disabled:opacity-45 dark:border-neutral-700 dark:hover:enabled:border-neutral-500";

interface ProjectEndDateSelectorProps {
  value: string;
  min?: string;
  error?: string;
  onChange: (value: string) => void;
}

const shortDate = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const fullDate = new Intl.DateTimeFormat("es-PE", { dateStyle: "full" });
const monthName = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
});
const weekdays = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function dateKey(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function Calendar({
  value,
  min,
  max,
  label = "Fecha de fin estimada",
  optional = true,
  onChange,
  close,
}: ProjectEndDateSelectorProps & {
  close: () => void;
  max?: string;
  label?: string;
  optional?: boolean;
}) {
  const today = projectToday();
  const initial = value || min || today;
  const [month, setMonth] = useState(
    () =>
      new Date(
        readDate(initial).getFullYear(),
        readDate(initial).getMonth(),
        1,
        12,
      ),
  );
  const [focusedDate, setFocusedDate] = useState(initial);
  const grid = useRef<HTMLDivElement>(null);
  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1 - month.getDay(),
    12,
  );
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(
        first.getFullYear(),
        first.getMonth(),
        first.getDate() + index,
        12,
      ),
  );
  const previousEnd = dateKey(
    new Date(month.getFullYear(), month.getMonth(), 0, 12),
  );

  function changeMonth(offset: number) {
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + offset,
      1,
      12,
    );
    setMonth(next);
    const firstAllowed = min && dateKey(next) < min ? min : dateKey(next);
    setFocusedDate(firstAllowed);
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (
      !(event.target instanceof HTMLButtonElement) ||
      !event.target.dataset.date
    )
      return;
    const current = readDate(event.target.dataset.date);
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -current.getDay(),
      End: 6 - current.getDay(),
    };
    if (
      !(event.key in offsets) &&
      event.key !== "PageUp" &&
      event.key !== "PageDown"
    )
      return;
    event.preventDefault();
    const next = new Date(current);
    if (event.key in offsets) next.setDate(next.getDate() + offsets[event.key]);
    else {
      next.setDate(1);
      next.setMonth(next.getMonth() + (event.key === "PageUp" ? -1 : 1));
      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0,
      ).getDate();
      next.setDate(Math.min(current.getDate(), lastDay));
    }
    const key = dateKey(next);
    if ((min && key < min) || (max && key > max)) return;
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setFocusedDate(key);
    requestAnimationFrame(() =>
      grid.current?.querySelector<HTMLElement>(`[data-date="${key}"]`)?.focus(),
    );
  }

  return (
    <div
      className="grid gap-2"
      tabIndex={-1}
      data-panel-focus
      onFocus={(event) => {
        if (event.target !== event.currentTarget) return;
        const day =
          grid.current?.querySelector<HTMLElement>(
            `[data-date="${focusedDate}"]:not(:disabled)`,
          ) ??
          grid.current?.querySelector<HTMLElement>(
            "[data-date]:not(:disabled)",
          );
        day?.focus({ preventScroll: true });
      }}
    >
      <p className="m-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        {label} <span className="whitespace-nowrap">({optional ? "opcional" : "obligatoria"})</span>
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          className={navButton}
          disabled={Boolean(min && previousEnd < min)}
          onClick={() => changeMonth(-1)}
        >
          <ChevronDownIcon className="size-4 rotate-90" />
        </button>
        <strong className="text-xs capitalize text-neutral-800 dark:text-neutral-100" aria-live="polite">{monthName.format(month)}</strong>
        <button
          type="button"
          aria-label="Mes siguiente"
          className={navButton}
          disabled={Boolean(
            max &&
            dateKey(
              new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
            ) > max,
          )}
          onClick={() => changeMonth(1)}
        >
          <ChevronDownIcon className="size-4 -rotate-90" />
        </button>
      </div>
      <div
        ref={grid}
        role="grid"
        aria-label={monthName.format(month)}
        onKeyDown={navigate}
      >
        <div role="row" className="grid grid-cols-7 gap-0.5">
          {weekdays.map((day) => (
            <span key={day} role="columnheader" aria-label={day} className="grid min-h-7 place-items-center text-xs text-neutral-600 dark:text-neutral-400">
              {day.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className="grid grid-cols-7 gap-0.5">
            {days.slice(week * 7, week * 7 + 7).map((date) => {
              const key = dateKey(date);
              const disabled = Boolean(
                (min && key < min) || (max && key > max),
              );
              const past = key < today && !disabled;
              return (
                <button
                  type="button"
                  key={key}
                  role="gridcell"
                  data-date={key}
                  className={`min-h-8 min-w-0 cursor-pointer rounded-lg border border-transparent p-1 text-xs tabular-nums text-neutral-900 hover:enabled:border-neutral-200 aria-selected:border-neutral-700 aria-selected:hover:enabled:border-neutral-400 disabled:cursor-default disabled:opacity-45 dark:text-neutral-100 dark:hover:enabled:border-neutral-700 dark:aria-selected:border-neutral-300${date.getMonth() !== month.getMonth() ? " text-neutral-500" : ""}${past ? " text-neutral-600! aria-selected:text-red-700! aria-selected:border-red-700" : ""}${today === key ? " underline underline-offset-2" : ""}`}
                  aria-label={`${fullDate.format(date)}${past ? " · Fecha anterior a hoy, seleccionable" : ""}`}
                  data-past={past || undefined}
                  aria-selected={value === key}
                  aria-current={today === key ? "date" : undefined}
                  disabled={disabled}
                  tabIndex={key === focusedDate && !disabled ? 0 : -1}
                  data-panel-focus={
                    key === focusedDate && !disabled ? "" : undefined
                  }
                  onFocus={(event) => {
                    setFocusedDate(key);
                    event.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                    });
                  }}
                  onClick={() => {
                    onChange(key);
                    close();
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {optional && (
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
          <button
            type="button"
            className={actionButton}
            disabled={!value}
            onClick={() => {
              onChange("");
              close();
            }}
          >
            Quitar fecha
          </button>
          <button type="button" className={actionButton} onClick={close}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectEndDateSelector(
  props: ProjectEndDateSelectorProps,
) {
  const value = props.value
    ? shortDate.format(readDate(props.value))
    : "Fecha de fin estimada";
  return (
    <TaskProperty
      id="project-end-date"
      label="Fecha de fin estimada (opcional)"
      value={value}
      icon={CalendarIcon}
      error={props.error}
    >
      {(close) => <Calendar {...props} close={close} />}
    </TaskProperty>
  );
}
