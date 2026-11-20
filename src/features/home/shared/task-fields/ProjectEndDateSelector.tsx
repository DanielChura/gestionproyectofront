import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import TaskProperty from "./TaskProperty";
import CalendarIcon from "../../../../shared/icons/CalendarIcon";
import { projectToday } from "../../utils/taskGrouping";
import {
  calendarDate as readDate,
  calendarDateKey as dateKey,
  addCalendarDays,
} from "../../utils/calendarDate";
import ChevronIcon from "../../../../shared/icons/ChevronIcon";

const styles = {
  calendar: "grid gap-2",
  caption:
    "m-0 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 [&_span]:whitespace-nowrap",
  heading:
    "flex items-center justify-between gap-2 [&_strong]:text-[13px] [&_strong]:capitalize [&_button]:grid [&_button]:size-8 [&_button]:place-items-center [&_button]:rounded-md [&_button]:border [&_button]:border-transparent [&_button]:bg-white dark:[&_button]:bg-neutral-900 [&_button]:p-0 [&_button]:text-neutral-900 dark:[&_button]:text-neutral-100 [&_button]:cursor-pointer [&_button:hover:enabled]:bg-neutral-100",
  week: "grid grid-cols-7 gap-1 [&>span]:grid [&>span]:min-h-7 [&>span]:place-items-center [&>span]:text-[11px] [&>span]:text-neutral-600 dark:[&>span]:text-neutral-400",
  day: "min-h-8 min-w-0 cursor-pointer rounded-md border border-transparent bg-white p-1 text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 tabular-nums aria-[current=date]:underline aria-[current=date]:underline-offset-2 aria-selected:bg-neutral-100 dark:aria-selected:bg-neutral-700 dark:aria-selected:text-neutral-100 dark:aria-selected:border-neutral-400 aria-selected:border-neutral-700 aria-selected:hover:enabled:bg-neutral-100 disabled:opacity-45 disabled:cursor-default",
  outside: "text-neutral-500 dark:text-neutral-400",
  actions:
    "flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 [&_button]:min-h-8 [&_button]:rounded-md [&_button]:border [&_button]:border-neutral-200 [&_button]:bg-neutral-100 dark:[&_button]:bg-neutral-800 [&_button]:px-2 [&_button]:py-1 [&_button]:text-xs [&_button]:cursor-pointer [&_button:hover:enabled]:bg-neutral-100",
};

interface ProjectEndDateSelectorProps {
  value: string;
  min?: string;
  error?: string;
  fitViewport?: boolean;
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

export function Calendar({
  value,
  min,
  max,
  label = "Fecha de fin estimada",
  optional = true,
  warningBefore,
  onChange,
  close,
}: ProjectEndDateSelectorProps & {
  close: () => void;
  max?: string;
  label?: string;
  optional?: boolean;
  warningBefore?: string | null;
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
    const next =
      event.key in offsets
        ? readDate(
            addCalendarDays(event.target.dataset.date, offsets[event.key]),
          )
        : new Date(current);
    if (!(event.key in offsets)) {
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
      className={styles.calendar}
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
      <p className={styles.caption}>
        {label} <span>({optional ? "opcional" : "obligatoria"})</span>
      </p>
      <div className={styles.heading}>
        <button
          type="button"
          aria-label="Mes anterior"
          disabled={Boolean(min && previousEnd < min)}
          onClick={() => changeMonth(-1)}
        >
          <ChevronIcon className="size-4" />
        </button>
        <strong aria-live="polite">{monthName.format(month)}</strong>
        <button
          type="button"
          aria-label="Mes siguiente"
          disabled={Boolean(
            max &&
            dateKey(
              new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
            ) > max,
          )}
          onClick={() => changeMonth(1)}
        >
          <ChevronIcon className="size-4" />
        </button>
      </div>
      <div
        ref={grid}
        role="grid"
        aria-label={monthName.format(month)}
        onKeyDown={navigate}
      >
        <div role="row" className={styles.week}>
          {weekdays.map((day) => (
            <span key={day} role="columnheader" aria-label={day}>
              {day.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className={styles.week}>
            {days.slice(week * 7, week * 7 + 7).map((date) => {
              const key = dateKey(date);
              const disabled = Boolean(
                (min && key < min) || (max && key > max),
              );
              const past = key < today && !disabled;
              const warning =
                !disabled &&
                key <
                  (warningBefore === undefined ? today : (warningBefore ?? ""));
              return (
                <button
                  type="button"
                  key={key}
                  role="gridcell"
                  data-date={key}
                  className={`${styles.day}${
                    date.getMonth() !== month.getMonth()
                      ? ` ${styles.outside}`
                      : ""
                  }${past ? " bg-neutral-100! text-neutral-600! dark:bg-neutral-800! dark:text-neutral-400!" : ""}${
                    warning
                      ? " aria-selected:bg-red-50! aria-selected:text-red-700! aria-selected:border-red-700"
                      : ""
                  }`}
                  aria-label={`${fullDate.format(date)}${
                    past ? " · Fecha anterior a hoy, seleccionable" : ""
                  }`}
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
        <div className={styles.actions}>
          <button
            type="button"
            disabled={!value}
            onClick={() => {
              onChange("");
              close();
            }}
          >
            Quitar fecha
          </button>
          <button type="button" onClick={close}>
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
      fitViewport={props.fitViewport}
    >
      {(close) => <Calendar {...props} close={close} />}
    </TaskProperty>
  );
}
