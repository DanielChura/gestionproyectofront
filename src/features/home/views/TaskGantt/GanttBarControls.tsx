import type { Task } from "../../types";
import type { ganttBarGeometry } from "./ganttSceneGeometry";

export default function GanttBarControls({
  model: m,
}: {
  model: {
    task: Task;
    bar: NonNullable<ReturnType<typeof ganttBarGeometry>>;
    header: number;
    onDates: (task: Task) => void;
  };
}) {
  const controls = [
    { mode: "start", x: m.bar.resizeStart, label: "Cambiar inicio" },
    { mode: "end", x: m.bar.resizeEnd, label: "Cambiar límite" },
  ] as const;
  return controls.map((control) =>
    control.x === null ? null : (
      <button
        key={control.mode}
        type="button"
        className="gm-gantt-bar-control"
        data-gantt-edit-task={m.task.id}
        data-gantt-calendar-mode={control.mode}
        aria-label={`${control.label} de ${m.task.name}`}
        title={`${control.label}; arrastra o abre el calendario`}
        style={{ left: control.x - 12, top: m.header + m.bar.y - 12 }}
        onClick={() => m.onDates(m.task)}
      >
        <span
          aria-hidden="true"
          className="h-3.5 w-0.5 rounded-sm bg-current opacity-60"
        />
      </button>
    ),
  );
}
