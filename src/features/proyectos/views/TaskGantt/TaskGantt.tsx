import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import { Locale } from "@svar-ui/react-core";
import type { IColumnConfig } from "@svar-ui/react-gantt";
import type { GanttRow, TaskGanttProps } from "./types";
import TaskDateValue from "../TaskForm/TaskDateValue";
import ChevronDownIcon from "../../../shared/icons/ChevronDownIcon";
import { useGanttLayout } from "./useGanttLayout";
import { useTaskGantt } from "./useTaskGantt";
import TaskGanttActions from "./TaskGanttActions";
import TaskGanttToolbar from "./TaskGanttToolbar";
import TaskGanttScene from "./TaskGanttScene";
import GanttSplitter from "./GanttSplitter";
import GanttDependencyOperation from "./GanttDependencyOperation";
import QuickTaskRow from "../TaskList/QuickTaskRow";
import { StateIcon, StateBadge } from "../TaskList/TaskCell";
import { shiftGanttDay, viewportCellWidth } from "./ganttViewport";
import { calendarDateKey } from "../calendarDate";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import { useGanttCalendar } from "./useGanttCalendar";
import TaskGanttBar from "./TaskGanttBar";
import { GanttCalendarContext, GanttGestureContext } from "./ganttCalendarContext";
import TaskGanttCalendarFeedback from "./TaskGanttCalendarFeedback";
import TaskGanttFields from "./TaskGanttFields";
import PlusIcon from "../../../shared/icons/PlusIcon";
import ChevronLeftIcon from "../../../shared/icons/ChevronLeftIcon";
import ChevronRightIcon from "../../../shared/icons/ChevronRightIcon";
import { GanttIconButton } from "./GanttControl";
import "@svar-ui/react-gantt/all.css";
import "./taskGantt.css";

interface GanttActions {
  openTask: (id: number) => void;
  toggleBranch: (id: number, expanded: boolean) => void;
  filtered: boolean;
  createChild: (id: number) => void;
  canCreateChild: (id: number) => boolean;
}

const TaskActions = createContext<GanttActions>({ openTask() {}, toggleBranch() {}, filtered: false, createChild() {}, canCreateChild() { return false; } });
const FieldsActions = createContext<{ open: () => void; expanded: boolean; capture?: (node: HTMLButtonElement | null) => void }>({ open() {}, expanded: false });

function FieldsHeader() {
  const fields = useContext(FieldsActions);
  return <GanttIconButton id="gantt-fields-trigger" ref={node => fields.capture?.(node)} label="Añadir o quitar columnas" aria-haspopup="dialog" aria-expanded={fields.expanded}
    aria-controls="gantt-fields-panel" onClick={event => { event.stopPropagation(); fields.open(); }}><PlusIcon className="size-4" /></GanttIconButton>;
}


type CellProps = Parameters<NonNullable<IColumnConfig["cell"]>>[0];

function TaskName({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  const actions = useContext(TaskActions);
  return <div className="flex w-full min-w-0 items-center gap-1">
    {task.gmHasChildren && <button type="button"
      aria-label={(task.open ? "Contraer" : "Expandir") + " subtareas de " + task.text}
      aria-expanded={task.open} disabled={actions.filtered} onClick={() => actions.toggleBranch(task.id, !task.open)}
      className="shrink-0 cursor-pointer rounded p-1 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800">
      <span aria-hidden="true"><ChevronDownIcon className={"size-4 " + (task.open ? "" : "-rotate-90")} /></span>
    </button>}
    <span aria-hidden="true" className="shrink-0"><StateIcon {...task.gmState} /></span>
    <button type="button" onClick={() => actions.openTask(task.id)} title={task.text}
      aria-label={"Abrir tarea " + task.text}
      className="min-w-0 flex-1 cursor-pointer truncate rounded px-1 py-1 text-left text-xs text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800">
      <span className="block truncate">{task.text}</span>
      {task.gmContext && <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">Contexto</span>}
      {task.gmParentId !== null && task.parent === 0 && <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">Subtarea</span>}
    </button>
    {actions.canCreateChild(task.id) && <button type="button" aria-label={"Agregar subtarea de " + task.text} className="gm-gantt-add-child shrink-0 cursor-pointer rounded p-1 focus-visible:outline-2" onClick={event => { event.stopPropagation(); actions.createChild(task.id); }}><PlusIcon className="size-4" /></button>}
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
  return <StateBadge {...task.gmState} />;
}

function Responsible({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  return <span className="truncate" title={task.gmResponsible}>{task.gmResponsible}</span>;
}

const columns: IColumnConfig[] = [
  { id: "text", header: "Nombre", width: 250, cell: TaskName, resize: false },
  { id: "gmResponsible", header: "Responsable", width: 180, cell: Responsible, resize: false },
  { id: "gmStartDate", header: "Inicio", width: 130, cell: StartDate, resize: false },
  { id: "gmDueDate", header: "Fecha límite", width: 150, cell: DueDate, resize: false },
  { id: "gmStateName", header: "Estado", width: 150, cell: TaskState, resize: false },
];
const links: [] = [];
const localeWords = { calendar: { weekStart: 1 } };
const weekends = (date: Date, unit: string) => unit === "day" && [0, 6].includes(date.getDay()) ? "gm-gantt-weekend" : "";
const taskTypes = [{ id: "task", label: "Tarea" }, { id: "gm-open-ended", label: "Sin fecha límite" }];

export default function TaskGantt(props: TaskGanttProps) {
  const { tasks, onOpenTask } = props;
  const layout = useGanttLayout();
  const { container, canvas, visible, gridWidth, minWidth, overlay } = layout;
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [quick, setQuick] = useState<number | null | undefined>(undefined);
  const [quickBusy, setQuickBusy] = useState(false);
  const [linkOperation, setLinkOperation] = useState<{source: number; target: number} | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const fieldsTrigger = useRef<HTMLButtonElement>(null);
  const fieldsWereOpen = useRef(false);
  const captureFieldsTrigger = useCallback((node: HTMLButtonElement | null) => { fieldsTrigger.current = node; }, []);
  const fieldsActions = useMemo(() => ({ open: () => setFieldsOpen(current => !current), expanded: fieldsOpen, capture: captureFieldsTrigger }), [fieldsOpen, captureFieldsTrigger]);
  const visibleColumns = useMemo(() => columns.filter(column => column.id === "text" || visible.has(String(column.id))), [visible]);
  useLayoutEffect(() => {
    if (fieldsWereOpen.current && !fieldsOpen) fieldsTrigger.current?.focus({ preventScroll: true });
    fieldsWereOpen.current = fieldsOpen;
  }, [fieldsOpen]);
  const calendar = useGanttCalendar(tasks);
  const { pending, syncRevision } = calendar;
  const controls = useTaskGantt(props, calendar.gesture.allowPreview, calendar.attach);
  const { viewport, scales, selected, attach, resizeGrid, toggleBranch, filtered } = controls;
  const boundaryWidth = controls.actualGridWidth ?? gridWidth;
  const rows = useMemo(() => controls.rows.map((row) => ({ ...row, gmCalendarPending: pending(row.id), gmPaint: calendar.revision + ":" + calendar.paint + ":" + syncRevision })), [controls.rows, calendar.revision, calendar.paint, pending, syncRevision]);
  useLayoutEffect(() => { resizeGrid(gridWidth); }, [resizeGrid, gridWidth]);
  useEffect(() => { calendar.gesture.cancel(); }, [calendar.gesture, viewport, controls.filters]);
  useEffect(() => { calendar.gesture.refresh(); }, [calendar.gesture, rows, calendar.preview]);
  const byId = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const actions = useMemo(() => ({ openTask: onOpenTask, toggleBranch, filtered, createChild: (id: number) => { if (!quickBusy) setQuick(id); }, canCreateChild: (id: number) => !props.actionsDisabled && !quickBusy && Boolean(byId.get(id)?.permissions.create_child) }), [onOpenTask, toggleBranch, filtered, quickBusy, byId, props.actionsDisabled]);
  return <GanttCalendarContext.Provider value={calendar.snapshot}><GanttGestureContext.Provider value={calendar.preview?.id ?? null}><TaskActions.Provider value={actions}><FieldsActions.Provider value={fieldsActions}>
    <div className="sr-only">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Ventana de tareas</h2>
      <p className="m-0 text-xs text-neutral-600 dark:text-neutral-300">{tasks.some((task) => task.permissions.edit) ? "Arrastre y ajuste de fechas" : "Solo lectura"}</p>
    </div>
    <TaskGanttToolbar controls={controls} onRefresh={props.onRetry} loading={props.loading} createAction={props.createAction} />
    <TaskGanttActions task={tasks.find((task) => task.id === controls.selectedId)} disabled={props.actionsDisabled || quickBusy} onOpenTask={onOpenTask} onAction={(kind, id) => kind === "child" ? setQuick(id) : props.onAction?.(kind, id)} />
    {rows.length === 0 && tasks.length > 0 && !props.loading && <p role="status" className="py-3 text-xs text-neutral-800 dark:text-neutral-200">No hay tareas que coincidan con los filtros.</p>}
    {tasks.some((task) => task.due_date === null) && <p className="sr-only">
      Las tareas sin fecha límite conservan su inicio en la tabla y no tienen barra temporal.
    </p>}
    <div ref={container} className="gm-gantt-body relative flex min-w-0 items-stretch">
    <div ref={canvas} className="gm-gantt-canvas min-w-0 flex-1 overscroll-x-contain overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2" inert={fieldsOpen && overlay} tabIndex={0} role="region" aria-label="Calendario de tareas; tabla y línea de tiempo"
      onWheelCapture={event => { if (event.deltaX || event.shiftKey) controls.manualNavigation(); }}>
      <div style={{ minWidth }}>
      <div className="gm-gantt-chart-top relative grid items-center gap-0 text-xs text-neutral-600 dark:text-neutral-300" style={{ gridTemplateColumns: `${boundaryWidth}px minmax(0, 1fr)` }}>
        <p role="status" className="m-0 truncate py-2 pr-2">
          {calendar.preview ? <span className="gm-gantt-preview font-medium text-sky-800 dark:text-sky-300">{calendar.preview.name}: {formatTaskDate(calendar.preview.start_date)} — {formatTaskDate(calendar.preview.due_date)}</span>
            : <>{controls.projection.matches.size} de {tasks.length} tareas{rows.length > controls.projection.matches.size ? ` · ${rows.length - controls.projection.matches.size} ancestros de contexto` : ""}</>}
        </p>
        <nav aria-label="Navegación temporal de Gantt" className="flex min-w-0 items-center justify-between gap-1 pl-1 pr-16">
          <GanttIconButton label="Anterior" onClick={() => controls.page(-1)}><ChevronLeftIcon className="size-4" /></GanttIconButton>
          <span className="min-w-0 truncate tabular-nums">{calendarDateKey(viewport.start)} — {calendarDateKey(shiftGanttDay(viewport.end, -1))}</span>
          <GanttIconButton label="Siguiente" onClick={() => controls.page(1)}><ChevronRightIcon className="size-4" /></GanttIconButton>
        </nav>
        <div className="gm-gantt-zoom right-0 top-0.5 flex-row!">
          <GanttIconButton label="Acercar cronograma" disabled={viewport.scale === "day"} onClick={() => controls.zoom(1)}><PlusIcon className="size-4" /></GanttIconButton>
          <GanttIconButton label="Alejar cronograma" disabled={viewport.scale === "year"} onClick={() => controls.zoom(-1)}><svg className="size-4" viewBox="0 0 24 24"><path d="M5 12h14" stroke="currentColor" /></svg></GanttIconButton>
        </div>
      </div>
      <div className="gm-task-gantt relative" data-calendar-dragging={Boolean(calendar.preview) || undefined} onPointerDownCapture={calendar.onPointerDownCapture}>
        <div className="gm-gantt-header-tools absolute z-10 rounded-lg bg-white dark:bg-neutral-900" style={{ left: boundaryWidth - 34, top: Math.max(0, (scales.length * 28 - 28) / 2) }}><FieldsHeader /></div>
        <div className="gm-gantt-native"><Locale words={localeWords}><Willow fonts={false}>
          <Gantt tasks={rows} taskTypes={taskTypes} links={links} columns={visibleColumns} scales={scales} selected={selected}
            start={viewport.start} end={viewport.end} autoScale={false} durationUnit="day" lengthUnit="day" inclusiveEnd
            cellWidth={viewportCellWidth(viewport)} cellHeight={40} scaleHeight={28} gridWidth={gridWidth}
            highlightTime={weekends} displayMode={["grid", "chart"]} taskTemplate={TaskGanttBar} readonly ref={attach} onOpenTask={controls.onOpenTask} onSelectTask={controls.onSelectTask} />
        </Willow></Locale></div>
        <GanttSplitter width={boundaryWidth} available={layout.available} onResize={resizeGrid} onCommit={layout.setPreferredWidth} />
        <TaskGanttScene api={controls.api} tasks={tasks} dependencies={controls.dependencies} today={controls.today} selected={controls.selectedId}
          canLink={!props.actionsDisabled && !linkBusy} onLink={(source, target) => { if (!linkBusy) setLinkOperation({source, target}); }} onInspect={(source, target) => { if (!linkBusy) setLinkOperation({source, target}); }}
          />
      </div>
      </div>
    </div>
    {fieldsOpen && <TaskGanttFields layout={layout} overlay={overlay} onClose={() => setFieldsOpen(false)} />}
    </div>
    <TaskGanttCalendarFeedback calendar={calendar} />
    {quick === undefined ? <div className="flex flex-wrap gap-2 border-t border-neutral-200 py-2 dark:border-neutral-700 text-xs dark:text-neutral-200">
      {props.project.permissions.create_tasks && <button type="button" disabled={props.actionsDisabled} className="cursor-pointer rounded-lg px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-2" onClick={() => setQuick(null)}>+ Agregar tarea</button>}
    </div> : <section aria-label="Creación inline de Gantt" className="gm-gantt-inline border-t border-neutral-200 text-xs dark:border-neutral-700 dark:text-neutral-200">
      <p className="m-0 px-3 pt-2">{quick === null ? props.project.name : "Subtarea de " + byId.get(quick)?.name}</p>
      <QuickTaskRow key={String(quick)} project={props.project} catalogs={props.catalogs} parent={quick === null ? undefined : byId.get(quick)}
        onCreated={props.onCreated} onDetachedCreated={props.onCreated} onBusyChange={setQuickBusy} onCheckCreation={props.onRetry}
        onClose={() => { setQuick(undefined); setQuickBusy(false); }} />
    </section>}
    {linkOperation && <GanttDependencyOperation key={`${linkOperation.source}:${linkOperation.target}`} props={props} sourceId={linkOperation.source} targetId={linkOperation.target} onBusyChange={setLinkBusy} onClose={() => { setLinkOperation(null); setLinkBusy(false); }} />}
  </FieldsActions.Provider></TaskActions.Provider></GanttGestureContext.Provider></GanttCalendarContext.Provider>;
}
