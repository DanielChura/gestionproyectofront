import { useEffect, useRef, useState } from "react";
import Modal from "../../../../shared/components/Modal/Modal";

import { useTaskCalendarEdit } from "../../utils/useTaskCalendarEdit";
import { useTaskSync } from "../../utils/useTaskSync";
import { errorText } from "../../../auth/api";
import { apiFieldErrors } from "../../utils/formErrors";
import type { FieldErrors } from "../../utils/formErrors";
import type { TaskGanttProps } from "./types";
import type { Task } from "../../types";
import { taskCreationDay } from "../../shared/task-fields/taskDates";
import { ganttControl } from "./GanttControl";
import Calendar from "../../shared/task-fields/Calendar";
import CalendarEditFeedback from "../../shared/CalendarEditFeedback";

export default function GanttRangeDialog({
  task,
  props,
  onClose,
  initial,
}: {
  initial?: { start_date: string; due_date: string | null };
  task: Task;
  props: TaskGanttProps;
  onClose: () => void;
}) {
  const [start, setStart] = useState(
      initial?.start_date ?? task.start_date ?? "",
    ),
    [end, setEnd] = useState(initial?.due_date ?? task.due_date ?? "");
  const [field, setField] = useState<"start" | "end">(
    task.start_date ? "end" : "start",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [errors, setErrors] = useState<FieldErrors>({});
  const pending = useRef(false),
    alive = useRef(false);
  const editor = useTaskCalendarEdit(task),
    sync = useTaskSync();
  const parent = props.tasks.find((item) => item.id === task.parent_id);
  const minimum =
    [props.project.start_date, parent?.start_date]
      .filter(Boolean)
      .sort()
      .at(-1) || undefined;
  const maximum =
    [props.project.end_date, parent?.due_date].filter(Boolean).sort()[0] ||
    undefined;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function save() {
    if (pending.current || editor.blocked) return;
    if (!start || (end && end < start)) {
      setError("Indica un inicio y un límite igual o posterior.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setErrors({});
    try {
      await editor.save(
        { start_date: start, due_date: end || null },
        async (payload) => {
          const saved = await sync.patch(task.id, payload);
          if (alive.current && sync.isCurrent()) props.onCreated(saved);
        },
      );
      if (alive.current && sync.isCurrent()) onClose();
    } catch (failure) {
      if (alive.current && sync.isCurrent()) {
        setError(errorText(failure));
        setErrors(
          apiFieldErrors(failure, {
            start_date: "start",
            due_date: "end",
            schedule: "schedule",
          }),
        );
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <Modal compact title="Definir fechas" onClose={onClose} busy={busy}>
      <form
        className="gm-gantt-range grid gap-3 p-4 text-xs"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className="m-0 truncate" title={task.name}>
          {task.name}
        </p>
        <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                Fecha de inicio
                <input
                  data-initial-focus
                  name="start_date"
                  type="date"
                  value={start}
                  required
                  min={minimum}
                  max={end || maximum}
                  onFocus={() => setField("start")}
                  onChange={(event) => setStart(event.target.value)}
                  disabled={busy}
                  className={
                    ganttControl + " min-w-0 border-neutral-300! px-1!"
                  }
                />
              </label>
              <label className="grid gap-1">
                Fecha límite
                <input
                  name="due_date"
                  type="date"
                  value={end}
                  min={start || minimum}
                  max={maximum}
                  onFocus={() => setField("end")}
                  onChange={(event) => setEnd(event.target.value)}
                  disabled={busy}
                  className={
                    ganttControl + " min-w-0 border-neutral-300! px-1!"
                  }
                />
              </label>
            </div>
            <fieldset disabled={busy} className="min-w-0">
              <Calendar
                key={field}
                warningBefore={taskCreationDay(task.created_at)}
                label={field === "start" ? "Fecha de inicio" : "Fecha límite"}
                value={field === "start" ? start : end}
                optional={field === "end"}
                min={field === "start" ? minimum : start || minimum}
                max={field === "start" ? end || maximum : maximum}
                onChange={(value) => {
                  if (field === "start") {
                    setStart(value);
                    setField("end");
                  } else setEnd(value);
                }}
                close={() => setField("end")}
              />
            </fieldset>
        {(error || errors.start || errors.end) && (
          <p role="alert" className="m-0 text-red-700 dark:text-red-300">
            {errors.start || errors.end || error}          </p>
        )}
        <CalendarEditFeedback
          editor={editor}
          busy={busy}
          onPrepared={() => setError("")}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={ganttControl}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={ganttControl}
            disabled={busy || editor.blocked}
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
