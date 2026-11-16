import { scheduleLabel } from "../../utils/taskSchedule";
import { ganttRangeLabel } from "./ganttRangeLabel";
import type { Task } from "../../types";
import type { ConnectionRow } from "./useGanttConnection";
import type { useGanttConnection } from "./useGanttConnection";
import { missingGanttDates } from "./ganttSceneGeometry";
import { taskAssignees } from "../../utils/taskAssignees";
import GanttBarControls from "./GanttBarControls";
import Avatar from "../../../../shared/Avatar";
interface Model {
  rows: ConnectionRow[];
  header: number;
  width: number;
  hovered: number | null;
  programming: number | null;
  connection: ReturnType<typeof useGanttConnection>;
  canLink: boolean;
  protectedView: boolean;
  onOpen: (id: number) => void;
  onDates: (task: Task) => void;
  onLocate: (id: number) => void;
  canEdit: (task: Task) => boolean;
}
export default function GanttTimelineRows({ model: m }: { model: Model }) {
  return m.rows.map(({ task, geometry: bar }) => {
    const people = taskAssignees(task),
      person =
        people.find((person) => person.id === task.responsible_id) ?? people[0];
    const labelLeft = bar.labelLeft ?? 0;
    return (
      <div
        key={task.id}
        className="gm-gantt-row-overlay"
        data-connection-target={
          m.connection.draft?.target === task.id || undefined
        }
        data-connection-visible={
          m.hovered === task.id ||
          m.connection.draft?.source === task.id ||
          m.connection.draft?.target === task.id ||
          undefined
        }
      >
        {m.programming === task.id && (
          <div
            className="gm-gantt-program-row"
            style={{ top: m.header + bar.y - 20, width: m.width }}
          />
        )}
        {m.connection.draft?.target === task.id &&
          bar.left !== null &&
          bar.right !== null && (
            <div
              className="gm-gantt-connection-target"
              style={{
                top: m.header + bar.y - 14,
                left: bar.left,
                width: bar.right - bar.left,
              }}
            />
          )}
        {bar.outside && (
          <button
            type="button"
            className="gm-gantt-offscreen"
            data-gantt-offscreen={task.id}
            aria-label={`Mostrar intervalo ${bar.outside === "before" ? "anterior" : "posterior"}: ${task.name}`}
            title="Localizar intervalo sin modificar fechas"
            style={{
              left: bar.outside === "before" ? 0 : m.width - 24,
              top: m.header + bar.y - 12,
            }}
            onClick={() => m.onLocate(task.id)}
          >
            {bar.outside === "before" ? "‹" : "›"}
          </button>
        )}
        {bar.real && !bar.outside && !m.protectedView && m.canEdit(task) && (
          <GanttBarControls
            model={{ task, bar, header: m.header, onDates: m.onDates }}
          />
        )}
        {!bar.real && (
          <button
            type="button"
            data-gantt-missing-dates={task.id}
            title={missingGanttDates(task)}
            aria-label={`${missingGanttDates(task)}: ${task.name}`}
            className="gm-gantt-missing-dates"
            style={{ left: 0, top: m.header + bar.y - 12 }}
            disabled={m.protectedView || !m.canEdit(task)}
            onClick={() => m.onDates(task)}
          >
            <span aria-hidden="true" />
          </button>
        )}
        {bar.real &&
          bar.right !== null &&
          bar.right >= 0 &&
          labelLeft < m.width && (
            <div
              className="gm-gantt-exterior"
              data-gantt-label-task={task.id}
              style={{
                left: bar.labelSide === "before" ? undefined : labelLeft,
                right:
                  bar.labelSide === "before"
                    ? m.width - bar.labelRight
                    : undefined,
                top: m.header + bar.y - 12,
                maxWidth:
                  bar.labelSide === "before"
                    ? bar.labelRight
                    : m.width - labelLeft,
              }}
            >
              {person && (
                <Avatar
                  name={person.name}
                  title={person.name}
                  aria-label={person.name}
                  className="size-6 rounded-full bg-sky-600! text-[10px] text-neutral-100!"
                />
              )}
              <button
                type="button"
                className="cursor-pointer truncate bg-transparent px-1 py-1 text-left text-xs"
                title={
                  task.name +
                  (!task.permissions.dependencies
                    ? " · Consulta las dependencias desde el detalle."
                    : "")
                }
                aria-label={"Abrir detalle de " + task.name}
                onClick={() => m.onOpen(task.id)}
              >
                {task.name}
              </button>
            </div>
          )}
        {m.canLink &&
          (["start", "end"] as const).map((side) => {
            const x = side === "start" ? bar.startConnector : bar.endConnector;
            return x === null ? null : (
              <button
                key={side}
                type="button"
                data-connector-task={task.id}
                data-connector-side={side}
                disabled={Boolean(
                  m.connection.draft?.targets &&
                  !m.connection.draft.targets.has(task.id) &&
                  m.connection.draft.source !== task.id,
                )}
                data-connection-endpoint={
                  (m.connection.draft?.target === task.id &&
                    m.connection.draft.targetSide === side) ||
                  undefined
                }
                data-link-source={task.id}
                className="gm-gantt-connector absolute grid size-6 cursor-grab touch-none place-items-center border-0 bg-transparent p-0 active:cursor-grabbing"
                style={{ left: x - 12, top: m.header + bar.y - 12 }}
                title={`${task.name} · ${task.schedule?.precision === "hour" ? scheduleLabel(task) : ganttRangeLabel(task.start_date, task.due_date)}. Arrastrar desde ${side === "start" ? "inicio" : "fin"}; alternativa en detalle.`}
                aria-label={`Crear dependencia desde ${task.name}, ${side === "start" ? "inicio" : "fin"}`}
                onPointerDown={(event) =>
                  m.connection.start(event, task.id, side)
                }
                onClick={() => m.onOpen(task.id)}
              >
                <span aria-hidden="true" />
              </button>
            );
          })}
      </div>
    );
  });
}
