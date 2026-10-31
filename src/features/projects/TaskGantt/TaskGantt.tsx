import { createContext, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import type { IColumnConfig } from "@svar-ui/react-gantt";
import type { GanttRow, TaskGanttProps } from "./types";
import TaskDateValue from "../TaskForm/TaskDateValue";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import { useGanttLayout } from "./useGanttLayout";
import { useTaskGantt } from "./useTaskGantt";
import TaskGanttActions from "./TaskGanttActions";
import TaskGanttToolbar from "./TaskGanttToolbar";
import TaskGanttDependencies from "./TaskGanttDependencies";
import { shiftGanttDay, viewportCellWidth } from "./ganttViewport";
import { calendarDateKey } from "../calendarDate";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import { useGanttCalendar } from "./useGanttCalendar";
import TaskGanttBar from "./TaskGanttBar";
import { GanttCalendarContext, GanttGestureContext } from "./ganttCalendarContext";
import TaskGanttCalendarFeedback from "./TaskGanttCalendarFeedback";
import "@svar-ui/react-gantt/all.css";
import "./taskGantt.css";

interface GanttActions {
  openTask: (id: number) => void;
  toggleBranch: (id: number, expanded: boolean) => void;
  filtered: boolean;
}

const TaskActions = createContext<GanttActions>({ openTask() {}, toggleBranch() {}, filtered: false });

type CellProps = Parameters<NonNullable<IColumnConfig["cell"]>>[0];

function TaskName({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  const actions = useContext(TaskActions);
  return <div className="flex min-w-0 items-center gap-1">
    {task.gmHasChildren && <button type="button"
      aria-label={(task.open ? "Contraer" : "Expandir") + " subtareas de " + task.text}
      aria-expanded={task.open} disabled={actions.filtered} onClick={() => actions.toggleBranch(task.id, !task.open)}
      className="shrink-0 cursor-pointer rounded p-1 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800">
      <span aria-hidden="true"><ChevronDownIcon className={"size-4 " + (task.open ? "" : "-rotate-90")} /></span>
    </button>}
    <button type="button" onClick={() => actions.openTask(task.id)} title={task.text}
      aria-label={"Abrir tarea " + task.text}
      className="min-w-0 cursor-pointer truncate rounded px-1 py-1 text-left text-xs text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800">
      <span className="block truncate">{task.text}</span>
      {task.gmContext && <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">Contexto</span>}
      {task.gmParentId !== null && task.parent === 0 && <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">Subtarea</span>}
    </button>
  </div>;
}

function StartDate({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  return <time dateTime={task.gmStartDate}><TaskDateValue value={task.gmStartDate} createdAt={task.gmCreatedAt} /></time>;
}

function DueDate({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  return task.gmDueDate === null ? <span>Sin fecha límite</span>
    : <time dateTime={task.gmDueDate}><TaskDateValue value={task.gmDueDate} createdAt={task.gmCreatedAt} /></time>;
}

function TaskState({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  return <span className="truncate" title={task.gmStateName}>{task.gmStateName}</span>;
}

function Responsible({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  return <span className="truncate" title={task.gmResponsible}>{task.gmResponsible}</span>;
}

const columns: IColumnConfig[] = [
  { id: "text", header: "Tarea", width: 250, cell: TaskName, resize: false },
  { id: "gmResponsible", header: "Responsable", width: 180, cell: Responsible, resize: false },
  { id: "gmStartDate", header: "Inicio", width: 130, cell: StartDate, resize: false },
  { id: "gmDueDate", header: "Fecha límite", width: 150, cell: DueDate, resize: false },
  { id: "gmStateName", header: "Estado", width: 130, cell: TaskState, resize: false },
];
const links: [] = [];
const taskTypes = [{ id: "task", label: "Tarea" }, { id: "gm-open-ended", label: "Sin fecha límite" }];

export default function TaskGantt(props: TaskGanttProps) {
  const { tasks, onOpenTask } = props;
  const { container, visible, gridWidth, minWidth, toggle } = useGanttLayout();
  const visibleColumns = useMemo(() => columns.filter(column => column.id === "text" || visible.has(String(column.id))), [visible]);
  const calendar = useGanttCalendar(tasks);
  const { pending, syncRevision } = calendar;
  const controls = useTaskGantt(props, calendar.gesture.allowPreview, calendar.attach);
  const { viewport, scales, selected, attach, resizeGrid, toggleBranch, filtered } = controls;
  const rows = useMemo(() => controls.rows.map((row) => ({ ...row, gmCalendarPending: pending(row.id), gmPaint: calendar.revision + ":" + calendar.paint + ":" + syncRevision })), [controls.rows, calendar.revision, calendar.paint, pending, syncRevision]);
  useLayoutEffect(() => { resizeGrid(gridWidth); }, [resizeGrid, gridWidth]);
  useEffect(() => { calendar.gesture.cancel(); }, [calendar.gesture, viewport, controls.filters]);
  useEffect(() => { calendar.gesture.refresh(); }, [calendar.gesture, rows]);
  const actions = useMemo(() => ({ openTask: onOpenTask, toggleBranch, filtered }), [onOpenTask, toggleBranch, filtered]);
  return <GanttCalendarContext.Provider value={calendar.snapshot}><GanttGestureContext.Provider value={calendar.preview?.id ?? null}><TaskActions.Provider value={actions}>
    <div className="sr-only">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Ventana de tareas</h2>
      <p className="m-0 text-xs text-neutral-600 dark:text-neutral-300">{tasks.some((task) => task.permissions.edit) ? "Arrastre y ajuste de fechas" : "Solo lectura"}</p>
    </div>
    <TaskGanttToolbar controls={controls} layout={{ visible, toggle }} onRefresh={props.onRetry} loading={props.loading} />
    <TaskGanttActions task={tasks.find((task) => task.id === controls.selectedId)} disabled={props.actionsDisabled} onOpenTask={onOpenTask} onAction={props.onAction} />
    <p role="status" className="m-0 py-2 text-xs text-neutral-600 dark:text-neutral-300">
      {controls.projection.matches.size} de {tasks.length} tareas{rows.length > controls.projection.matches.size ? ` · ${rows.length - controls.projection.matches.size} ancestros de contexto` : ""}
      {calendar.preview ? <span className="gm-gantt-preview font-medium text-sky-800 dark:text-sky-300"> · {calendar.preview.name}: {formatTaskDate(calendar.preview.start_date)} — {formatTaskDate(calendar.preview.due_date)}</span>
        : <> · {calendarDateKey(viewport.start)} — {calendarDateKey(shiftGanttDay(viewport.end, -1))}</>}
    </p>
    {rows.length === 0 && <p role="status" className="py-3 text-xs text-neutral-800 dark:text-neutral-200">No hay tareas que coincidan con los filtros.</p>}
    {tasks.some((task) => task.due_date === null) && <p className="sr-only">
      Las tareas sin fecha límite conservan su inicio en la tabla y no tienen barra temporal.
    </p>}
    <div ref={container} className="overscroll-x-contain overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2" tabIndex={0} role="region" aria-label="Calendario de tareas; tabla y línea de tiempo">
      <div style={{ minWidth }} className="gm-task-gantt" data-calendar-dragging={Boolean(calendar.preview) || undefined} onPointerDownCapture={calendar.onPointerDownCapture}>
        <Willow fonts={false}>
          <Gantt tasks={rows} taskTypes={taskTypes} links={links} columns={visibleColumns} scales={scales} selected={selected}
            start={viewport.start} end={viewport.end} autoScale={false} durationUnit="day" lengthUnit="day" inclusiveEnd
            cellWidth={viewportCellWidth(viewport.scale)} cellHeight={40} scaleHeight={28} gridWidth={gridWidth}
            taskTemplate={TaskGanttBar} readonly ref={attach} onOpenTask={controls.onOpenTask} onSelectTask={controls.onSelectTask} />
        </Willow>
      </div>
    </div>
    <TaskGanttCalendarFeedback calendar={calendar} />
    <TaskGanttDependencies dependencies={controls.dependencies} selectedId={controls.selectedId}
      visible={controls.projection.visible} onLocate={controls.locate} />
  </TaskActions.Provider></GanttGestureContext.Provider></GanttCalendarContext.Provider>;
}
