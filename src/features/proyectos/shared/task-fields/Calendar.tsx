import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import ChevronDownIcon from "../../../../shared/icons/ChevronIcon";
import { projectToday } from "../../utils/taskGrouping";

interface CalendarProps {
  value: string;
  min?: string;
  max?: string;
  label?: string;
  optional?: boolean;
  onChange: (value: string) => void;
  close: () => void;
}

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

export default function Calendar({
  value,
  min,
  max,
  label = "Fecha de fin estimada",
  optional = true,
  onChange,
  close,
}: CalendarProps) {
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
    ) {
      return;
    }
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
    ) {
      return;
    }
    event.preventDefault();
    const next = new Date(current);
    if (event.key in offsets) {
      next.setDate(next.getDate() + offsets[event.key]);
    } else {
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
      className="grid gap-2 text-xs"
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
        {label}{" "}
        <span className="whitespace-nowrap">
          ({optional ? "opcional" : "obligatoria"})
        </span>
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Mes anterior"
          className="grid size-8 cursor-pointer place-items-center rounded-lg border border-transparent p-0 text-neutral-800 hover:enabled:border-neutral-200 disabled:cursor-default disabled:opacity-40 dark:text-neutral-100 dark:hover:enabled:border-neutral-700"
          disabled={Boolean(min && previousEnd < min)}
          onClick={() => changeMonth(-1)}
        >
          <ChevronDownIcon className="size-4 rotate-90" />
        </button>
        <span
          className="text-xs font-semibold capitalize text-neutral-800 dark:text-neutral-100"
          aria-live="polite"
        >
          {monthName.format(month)}
        </span>
        <button
          type="button"
          aria-label="Mes siguiente"
          className="grid size-8 cursor-pointer place-items-center rounded-lg border border-transparent p-0 text-neutral-800 hover:enabled:border-neutral-200 disabled:cursor-default disabled:opacity-40 dark:text-neutral-100 dark:hover:enabled:border-neutral-700"
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
            <span
              key={day}
              role="columnheader"
              aria-label={day}
              className="grid size-7 place-items-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400"
            >
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
                  className={`size-7 cursor-pointer rounded-lg border border-transparent p-1 text-xs tabular-nums text-neutral-800 hover:enabled:border-neutral-200 aria-selected:border-neutral-800 aria-selected:bg-neutral-800 aria-selected:text-neutral-100 disabled:cursor-default disabled:opacity-40 dark:text-neutral-100 dark:hover:enabled:border-neutral-700 dark:aria-selected:border-neutral-100 dark:aria-selected:bg-neutral-100 dark:aria-selected:text-neutral-900 ${date.getMonth() !== month.getMonth() ? "text-neutral-400 dark:text-neutral-600" : ""} ${past ? "text-red-600 dark:text-red-400" : ""} ${today === key ? "underline underline-offset-2" : ""}`}
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
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
          <button
            type="button"
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
            disabled={!value}
            onClick={() => {
              onChange("");
              close();
            }}
          >
            Quitar fecha
          </button>
          <button
            type="button"
            className="rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
            onClick={close}
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
