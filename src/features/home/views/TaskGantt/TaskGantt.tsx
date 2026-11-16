import GanttVerticalNavigation from "./GanttVerticalNavigation";
import { TaskActions } from "./ganttActionsContext";
import GanttNotice from "./GanttNotice";
import GanttDependencyCreate from "./GanttDependencyCreate";
import { bindGanttBarLayout } from "./ganttBarLayout";
import { toGanttWindow } from "./ganttCalendar";
import GanttProjectRow from "./GanttProjectRow";
import GanttTaskNameDialog from "./GanttTaskNameDialog";
import GanttRangeDialog from "./GanttRangeDialog";
import GanttDependencyUndo from "./GanttDependencyUndo";
import type { RemovedGanttLink } from "./GanttDependencyUndo";
import { useGanttPan } from "./useGanttPan";
import { useGanttTreeMove } from "./useGanttTreeMove";
import EditIcon from "../../../../shared/icons/EditIcon";
import PlusIcon from "../../../../shared/icons/PlusIcon";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import { Locale } from "@svar-ui/react-core";
import type { IColumnConfig } from "@svar-ui/react-gantt";
import type { GanttRow, TaskGanttProps } from "./types";
import TaskDateValue from "../../shared/task-fields/TaskDateValue";
import { useGanttLayout } from "./useGanttLayout";
import { useTaskGantt } from "./useTaskGantt";
import TaskGanttToolbar from "./TaskGanttToolbar";
import TaskGanttScene from "./TaskGanttScene";
import GanttSplitter from "./GanttSplitter";
import GanttDependencyOperation from "./GanttDependencyOperation";
import { viewportCellWidth, viewportUnit } from "./ganttViewport";
import { useGanttCalendar } from "./useGanttCalendar";
import TaskGanttBar from "./TaskGanttBar";
import TaskGanttCalendarFeedback from "./TaskGanttCalendarFeedback";
import TaskGanttFields from "./TaskGanttFields";
import {
  GanttCalendarContext,
  GanttGestureContext,
} from "./ganttCalendarContext";
import { GanttIconButton } from "./GanttControl";
import "@svar-ui/react-gantt/all.css";
import "./taskGantt.css";
import ChevronIcon from "../../../../shared/icons/ChevronIcon";
import { StateBadge, StateIcon } from "../../shared/TaskCell";
const FieldsActions = createContext<{
  open: () => void;
  expanded: boolean;
  capture?: (node: HTMLButtonElement | null) => void;
}>({ open() {}, expanded: false });
function FieldsHeader() {
  const fields = useContext(FieldsActions);
  return (
    <GanttIconButton
      id="gantt-fields-trigger"
      ref={(node) => fields.capture?.(node)}
      label="Añadir o quitar columnas"
      aria-haspopup="dialog"
      aria-expanded={fields.expanded}
      aria-controls="gantt-fields-panel"
      onClick={(event) => {
        event.stopPropagation();
        fields.open();
      }}
    >
      <PlusIcon className="size-4" />
    </GanttIconButton>
  );
}
type CellProps = Parameters<NonNullable<IColumnConfig["cell"]>>[0];
function TaskName({ row }: CellProps) {
  const task = row as unknown as GanttRow;
  const actions = useContext(TaskActions);
  if (
    (
      row as {
        gmFooter?: boolean;
      }
    ).gmFooter
  )
    return (
      <button
        type="button"
        className="cursor-pointer px-1 py-1 text-xs"
        onClick={(event) => {
          event.stopPropagation();
          actions.createRoot();
        }}
      >
        + Agregar tarea
      </button>
    );
  return (
    <div
      data-gantt-tree-id={task.id}
      data-tree-origin={actions.moving === task.id || undefined}
      data-tree-receiver={actions.receiver === task.id || undefined}
      className="gm-gantt-tree-row flex w-full min-w-0 items-center gap-1 pr-16"
      style={{
        paddingInlineStart:
          Math.min(
            Math.max(
              0,
              ((
                row as {
                  $level?: number;
                }
              ).$level ?? 1) - 1,
            ),
            4,
          ) * 12,
      }}
    >
      <span className="inline-flex size-5 shrink-0 items-center justify-center">
        {task.gmHasChildren && (
          <button
            type="button"
            aria-label={
              (task.open ? "Contraer" : "Expandir") +
              " subtareas de " +
              task.text
            }
            aria-expanded={task.open}
            disabled={actions.filtered}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.focus({ preventScroll: true });
            }}
            onClick={(event) => {
              event.stopPropagation();
              actions.toggleBranch(task.id, !task.open);
            }}
            className="shrink-0 cursor-pointer rounded p-0.5 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span aria-hidden="true">
              <ChevronIcon
                className={"size-4 " + (task.open ? "" : "-rotate-90")}
              />
            </span>
          </button>
        )}
      </span>
      <span aria-hidden="true" className="shrink-0">
        <StateIcon {...task.gmState} />
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          actions.openTask(task.id);
        }}
        title={task.text}
        aria-label={"Abrir tarea " + task.text}
        className="min-w-0 flex-1 cursor-pointer truncate rounded px-1 py-1 text-left text-xs text-neutral-800 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-1 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <span className="block truncate">{task.text}</span>
        {task.gmContext && (
          <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">
            Contexto
          </span>
        )}
        {task.gmParentId !== null && task.parent === 0 && (
          <span className="block text-[10px] text-neutral-600 dark:text-neutral-300">
            Subtarea
          </span>
        )}
      </button>
      <span
        className="gm-gantt-row-actions flex gap-1"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {
          <button
            type="button"
            title={
              actions.canCreateChild(task.id)
                ? "Crear subtarea"
                : "No se permite crear subtareas en este estado o con tus permisos"
            }
            aria-disabled={!actions.canCreateChild(task.id)}
            aria-label={"Crear subtarea de " + task.text}
            className="cursor-pointer rounded border border-neutral-300 bg-white p-1 dark:border-neutral-600 dark:bg-neutral-900"
            onClick={() => {
              if (actions.canCreateChild(task.id)) actions.createChild(task.id);
            }}
          >
            <PlusIcon className="size-4" />
          </button>
        }
        {
          <button
            type="button"
            title={
              actions.canRename(task.id)
                ? "Editar nombre"
                : "No tienes permiso para editar esta tarea"
            }
            aria-disabled={!actions.canRename(task.id)}
            aria-label={"Cambiar nombre de " + task.text}
            className="cursor-pointer rounded border border-neutral-300 bg-white p-1 dark:border-neutral-600 dark:bg-neutral-900"
            onClick={() => {
              if (actions.canRename(task.id)) actions.rename(task.id);
            }}
          >
            <EditIcon className="size-4" />
          </button>
        }
      </span>
    </div>
  );
}
function StartDate({ row }: CellProps) {
  if (
    (
      row as {
        gmFooter?: boolean;
      }
    ).gmFooter
  )
    return null;
  const task = row as unknown as GanttRow;
  return (
    <time dateTime={task.gmStartDate}>
      <TaskDateValue value={task.gmStartDate} createdAt={task.gmCreatedAt} />
    </time>
  );
}
function DueDate({ row }: CellProps) {
  if (
    (
      row as {
        gmFooter?: boolean;
      }
    ).gmFooter
  )
    return null;
  const task = row as unknown as GanttRow;
  return task.gmDueDate === null ? (
    <span>Sin fecha límite</span>
  ) : (
    <time dateTime={task.gmDueDate}>
      <TaskDateValue value={task.gmDueDate} createdAt={task.gmCreatedAt} />
    </time>
  );
}
function TaskState({ row }: CellProps) {
  if (
    (
      row as {
        gmFooter?: boolean;
      }
    ).gmFooter
  )
    return null;
  const task = row as unknown as GanttRow;
  return <StateBadge {...task.gmState} />;
}
function Responsible({ row }: CellProps) {
  if (
    (
      row as {
        gmFooter?: boolean;
      }
    ).gmFooter
  )
    return null;
  const task = row as unknown as GanttRow;
  return (
    <span className="truncate" title={task.gmResponsible}>
      {task.gmResponsible}
    </span>
  );
}
const columns: IColumnConfig[] = [
  { id: "text", header: "Nombre", width: 250, cell: TaskName, resize: false },
  {
    id: "gmResponsible",
    header: "Responsable",
    width: 180,
    cell: Responsible,
    resize: false,
  },
  {
    id: "gmStartDate",
    header: "Inicio",
    width: 130,
    cell: StartDate,
    resize: false,
  },
  {
    id: "gmDueDate",
    header: "Fecha límite",
    width: 150,
    cell: DueDate,
    resize: false,
  },
  {
    id: "gmStateName",
    header: "Estado",
    width: 150,
    cell: TaskState,
    resize: false,
  },
];
const links: [] = [];
const localeWords = { calendar: { weekStart: 1 } };
const weekends = (date: Date, unit: string) =>
  unit === "day" && [0, 6].includes(date.getDay()) ? "gm-gantt-weekend" : "";
const taskTypes = [
  { id: "task", label: "Tarea" },
  { id: "gm-open-ended", label: "Sin fecha límite" },
];
export default function TaskGantt(props: TaskGanttProps) {
  const { tasks, onOpenTask } = props;
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    task?: import("../../types").Task;
    parent?: import("../../types").Task;
    start?: string;
  } | null>(null);
  const [rangeTask, setRangeTask] = useState<import("../../types").Task | null>(
    null,
  );
  const [rangeInitial, setRangeInitial] = useState<
    | {
        start_date: string;
        due_date: string | null;
      }
    | undefined
  >(undefined);
  const [removedLinks, setRemovedLinks] = useState<RemovedGanttLink[]>([]);
  const [localProtected, setLocalProtected] = useState(false);
  const protectedView = props.protection?.active ?? localProtected;
  const setProtectedView = props.protection?.setActive ?? setLocalProtected;
  const [linkOperation, setLinkOperation] = useState<{
    source: number;
    target: number;
    autoRemove?: boolean;
    type?: import("../../types").DependencyType;
  } | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [changingLink, setChangingLink] = useState(false);
  const linkBusy = creatingLink || changingLink;
  const [linkCreate, setLinkCreate] = useState<{
    source: number;
    target: number;
    type: import("../../types").DependencyType;
  } | null>(null);
  const fieldsTrigger = useRef<HTMLButtonElement>(null);
  const fieldsWereOpen = useRef(false);
  const captureFieldsTrigger = useCallback((node: HTMLButtonElement | null) => {
    fieldsTrigger.current = node;
  }, []);
  const fieldsActions = useMemo(
    () => ({
      open: () => setFieldsOpen((current) => !current),
      expanded: fieldsOpen,
      capture: captureFieldsTrigger,
    }),
    [fieldsOpen, captureFieldsTrigger],
  );
  useLayoutEffect(() => {
    if (fieldsWereOpen.current && !fieldsOpen)
      fieldsTrigger.current?.focus({ preventScroll: true });
    fieldsWereOpen.current = fieldsOpen;
  }, [fieldsOpen]);
  const calendar = useGanttCalendar(tasks, props.onCreated, !protectedView);
  const { pending, syncRevision } = calendar;
  const controls = useTaskGantt(props, calendar.allowPreview, calendar.attach);
  const {
    viewport,
    scales,
    selected,
    attach,
    resizeGrid,
    toggleBranch,
    filtered,
  } = controls;
  useLayoutEffect(
    () => calendar.gesture.setNavigation(controls.navigation.scrollBy),
    [calendar.gesture, controls.navigation],
  );
  useLayoutEffect(() => {
    if (controls.api)
      return bindGanttBarLayout(
        controls.api,
        calendar.gesture.layout,
        calendar.gesture.dragging,
      );
  }, [controls.api, calendar.gesture]);
  const layout = useGanttLayout(controls.api);
  const {
    container,
    canvas: canvasRef,
    visible,
    gridWidth,
    minWidth,
    overlay,
  } = layout;
  const boundaryWidth = controls.actualGridWidth ?? gridWidth;
  const visibleColumns = useMemo(
    () =>
      columns
        .filter(
          (column) => column.id === "text" || visible.has(String(column.id)),
        )
        .map((column) =>
          column.id === "text"
            ? {
                ...column,
                width: Math.min(250, Math.max(160, boundaryWidth - 4)),
              }
            : column,
        ),
    [visible, boundaryWidth],
  );
  const rows = useMemo(
    () => [
      ...controls.rows.map((row) => ({
        ...row,
        ...(calendar.snapshot.get(row.id)?.status === "pending"
          ? {
              ...toGanttWindow(calendar.snapshot.get(row.id)!.proposal),
              type: "task",
            }
          : {}),
        gmCalendarPending:
          pending(row.id) ||
          calendar.snapshot.get(row.id)?.status === "pending",
        gmPaint: calendar.revision + ":" + calendar.paint + ":" + syncRevision,
      })),
      ...(props.project.permissions.create_tasks
        ? [
            {
              id: -1,
              parent: 0,
              text: "",
              type: "gm-open-ended",
              gmFooter: true,
            },
          ]
        : []),
    ],
    [
      controls.rows,
      calendar.revision,
      calendar.paint,
      calendar.snapshot,
      pending,
      syncRevision,
      props.project.permissions.create_tasks,
    ],
  );
  useLayoutEffect(() => {
    resizeGrid(gridWidth);
  }, [resizeGrid, gridWidth]);
  useEffect(() => {
    calendar.gesture.cancel();
  }, [calendar.gesture, viewport.scale, viewport.zoomLevel, controls.filters]);
  useEffect(() => {
    calendar.gesture.refresh();
  }, [calendar.gesture, rows, calendar.preview, viewport]);
  const {
    down: panDown,
    dragging: panning,
    captureSurface,
    vertical,
  } = useGanttPan(
    controls.api,
    protectedView,
    controls.manualNavigation,
    controls.navigation,
  );
  const { byId, movement, pointer } = useGanttTreeMove(
    props,
    controls.api,
    canvasRef,
    filtered,
    controls.projection.visible,
  );
  const actions = {
    openTask: onOpenTask,
    toggleBranch,
    filtered,
    createRoot: () => setDialog({}),
    moving: movement.dragging?.id,
    receiver: movement.drop?.receiver,
    createChild: (id: number) => setDialog({ parent: byId.get(id) }),
    rename: (id: number) => setDialog({ task: byId.get(id) }),
    canCreateChild: (id: number) =>
      !props.actionsDisabled && Boolean(byId.get(id)?.permissions.create_child),
    canRename: (id: number) =>
      !props.actionsDisabled && Boolean(byId.get(id)?.permissions.edit),
  };
  function rowDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      !(event.target instanceof Element) ||
      event.target.closest(".gm-gantt-row-actions")
    )
      return;
    const node = event.target.closest<HTMLElement>("[data-gantt-tree-id]");
    const task = node ? byId.get(Number(node.dataset.ganttTreeId)) : undefined;
    if (task)
      pointer.onPointerDown(
        event,
        task,
        !props.actionsDisabled && movement.permitted(task, task.state_code),
        node?.closest<HTMLElement>(".wx-row") ?? node ?? undefined,
      );
  }
  return (
    <>
      <GanttCalendarContext.Provider value={calendar.snapshot}>
        <GanttGestureContext.Provider value={calendar.preview?.id ?? null}>
          <TaskActions.Provider value={actions}>
            <FieldsActions.Provider value={fieldsActions}>
              <div className="sr-only">
                <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Ventana de tareas
                </h2>
                <p className="m-0 text-xs text-neutral-600 dark:text-neutral-300">
                  {tasks.some((task) => task.permissions.edit)
                    ? "Arrastre y ajuste de fechas"
                    : "Solo lectura"}
                </p>
              </div>
              <TaskGanttToolbar
                controls={controls}
                onRefresh={props.onRetry}
                loading={props.loading}
                createAction={props.createAction}
                protectedView={protectedView}
                onProtect={() => {
                  calendar.gesture.cancel();
                  if (!linkBusy) setLinkOperation(null);
                  setProtectedView(!protectedView);
                }}
              />
              {controls.rows.length === 0 &&
                tasks.length > 0 &&
                !props.loading && (
                  <p
                    role="status"
                    className="py-3 text-xs text-neutral-800 dark:text-neutral-200"
                  >
                    No hay tareas que coincidan con los filtros.
                  </p>
                )}
              {tasks.some((task) => task.due_date === null) && (
                <p className="sr-only">
                  Las tareas sin fecha límite conservan su inicio en la tabla y
                  no tienen barra temporal.
                </p>
              )}
              <div
                ref={container}
                className="gm-gantt-body relative flex min-w-0 items-stretch"
              >
                <div
                  ref={(node) => {
                    canvasRef.current = node;
                    captureSurface(node);
                  }}
                  className="gm-gantt-canvas min-w-0 flex-1 overscroll-x-contain overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
                  inert={fieldsOpen && overlay}
                  tabIndex={0}
                  role="region"
                  aria-label="Calendario de tareas; tabla y línea de tiempo"
                  onWheelCapture={(event) => {
                    if (event.deltaX || event.shiftKey)
                      controls.manualNavigation();
                  }}
                >
                  <GanttProjectRow
                    project={props.project}
                    tasks={tasks}
                    width={boundaryWidth}
                    controls={controls}
                  />

                  <div style={{ minWidth }}>
                    <div
                      className="gm-task-gantt relative"
                      data-calendar-dragging={
                        Boolean(calendar.preview) || undefined
                      }
                      data-protected={protectedView || undefined}
                      data-panning={panning || undefined}
                      data-gantt-scale={viewport.scale}
                      data-gantt-zoom={viewport.zoomLevel}
                      data-gantt-window-start={viewport.start.getTime()}
                      data-gantt-window-end={viewport.end.getTime()}
                      onPointerDownCapture={(event) => {
                        if (!panDown(event) && !protectedView)
                          calendar.onPointerDownCapture(event);
                      }}
                      onPointerDown={rowDown}
                      onClickCapture={pointer.onClickCapture}
                      onDragStartCapture={pointer.onDragStart}
                    >
                      <div
                        className="gm-gantt-header-tools absolute z-10 rounded-lg bg-white dark:bg-neutral-900"
                        style={{
                          left: boundaryWidth - 34,
                          top: Math.max(0, (scales.length * 28 - 28) / 2),
                        }}
                      >
                        <FieldsHeader />
                      </div>
                      <div
                        data-vertical-scroll={vertical.maximum > 0 || undefined}
                        className="gm-gantt-native data-[vertical-scroll]:pr-6 [&_.wx-gantt]:overflow-clip!"
                      >
                        <Locale words={localeWords}>
                          <Willow fonts={false}>
                            <Gantt
                              tasks={rows}
                              taskTypes={taskTypes}
                              links={links}
                              columns={visibleColumns}
                              scales={scales}
                              selected={selected}
                              start={viewport.start}
                              end={viewport.end}
                              autoScale={false}
                              durationUnit="day"
                              lengthUnit="day"
                              inclusiveEnd
                              cellWidth={viewportCellWidth(viewport)}
                              cellHeight={40}
                              scaleHeight={28}
                              gridWidth={gridWidth}
                              highlightTime={weekends}
                              displayMode={["grid", "chart"]}
                              taskTemplate={TaskGanttBar}
                              readonly
                              ref={attach}
                              onOpenTask={controls.onOpenTask}
                              onSelectTask={controls.onSelectTask}
                            />
                          </Willow>
                        </Locale>
                      </div>
                      <GanttVerticalNavigation model={vertical} />
                      <GanttSplitter
                        width={boundaryWidth}
                        available={layout.available}
                        onResize={resizeGrid}
                        onCommit={layout.setPreferredWidth}
                      />
                      <TaskGanttScene
                        project={props.project}
                        vertical={vertical}
                        api={controls.api}
                        tasks={tasks}
                        dependencies={controls.dependencies}
                        today={controls.today}
                        unit={viewportUnit(viewport)}
                        navigationKey={`${viewport.scale}:${viewport.zoomLevel}:${JSON.stringify(controls.filters)}`}
                        calendar={calendar}
                        canCreate={
                          !props.actionsDisabled &&
                          props.project.permissions.create_tasks
                        }
                        onCreateAt={(start) => setDialog({ start })}
                        protectedView={protectedView}
                        onDates={(task, initial) => {
                          setRangeInitial(initial);
                          setRangeTask(task);
                        }}
                        onOpen={onOpenTask}
                        onNavigate={controls.manualNavigation}
                        navigation={controls.navigation}
                        onLocate={controls.locate}
                        canLink={
                          !protectedView && !props.actionsDisabled && !linkBusy
                        }
                        onLink={(source, target, type) => {
                          if (!protectedView && !linkBusy && type) {
                            setCreatingLink(true);
                            setLinkCreate({ source, target, type });
                          }
                        }}
                        onRemove={(source, target) => {
                          if (!protectedView && !linkBusy)
                            setLinkOperation({
                              source,
                              target,
                              autoRemove: true,
                            });
                        }}
                        onInspect={(source, target) => {
                          if (!linkBusy) setLinkOperation({ source, target });
                        }}
                      />
                    </div>
                  </div>
                </div>
                {fieldsOpen && (
                  <TaskGanttFields
                    layout={layout}
                    overlay={overlay}
                    onClose={() => setFieldsOpen(false)}
                  />
                )}
              </div>
              <TaskGanttCalendarFeedback calendar={calendar} />
              {linkCreate && (
                <GanttDependencyCreate
                  key={`${props.project.id}:${linkCreate.source}:${linkCreate.target}`}
                  props={props}
                  operation={linkCreate}
                  onBusyChange={setCreatingLink}
                  onClose={() => {
                    setLinkCreate(null);
                    setCreatingLink(false);
                  }}
                />
              )}
              {movement.drop && (
                <div
                  className="gm-gantt-tree-insertion"
                  style={{
                    left: movement.drop.left,
                    top: movement.drop.top,
                    width: movement.drop.width,
                  }}
                  aria-hidden="true"
                />
              )}
              {movement.error && (
                <GanttNotice label="Orden de tareas" key={movement.error}>
                  {movement.error}
                  {movement.error && (
                    <button
                      type="button"
                      onClick={() => void movement.refresh()}
                    >
                      Consultar tareas
                    </button>
                  )}
                </GanttNotice>
              )}
              {dialog && (
                <GanttTaskNameDialog
                  key={
                    String(dialog.task?.id) + ":" + String(dialog.parent?.id)
                  }
                  project={props.project}
                  task={dialog.task}
                  parent={dialog.parent}
                  initialStart={dialog.start}
                  onConsult={props.onMoved}
                  onSaved={(saved) => {
                    props.onCreated(saved);
                    if (saved.parent_id !== null)
                      controls.toggleBranch(saved.parent_id, true);
                  }}
                  onClose={() => setDialog(null)}
                />
              )}
              {rangeTask && (
                <GanttRangeDialog
                  key={rangeTask.id}
                  task={rangeTask}
                  initial={rangeInitial}
                  props={props}
                  onClose={() => setRangeTask(null)}
                />
              )}
              <div className="pointer-events-none fixed bottom-14 left-4 z-60 grid max-h-[70vh] gap-2 overflow-y-auto">
                {removedLinks.map((removed) => (
                  <GanttDependencyUndo
                    key={
                      removed.source +
                      ":" +
                      removed.target +
                      ":" +
                      removed.expires
                    }
                    props={props}
                    removed={removed}
                    readOnly={protectedView || props.actionsDisabled}
                    onClose={() =>
                      setRemovedLinks((current) =>
                        current.filter((item) => item !== removed),
                      )
                    }
                  />
                ))}
              </div>
              {linkOperation && (
                <GanttDependencyOperation
                  key={`${linkOperation.source}:${linkOperation.target}`}
                  props={props}
                  autoRemove={linkOperation.autoRemove}
                  onRemoved={(source, target, type, receipt) =>
                    setRemovedLinks(() => [
                      {
                        source,
                        target,
                        type,
                        token: receipt?.token,
                        expires: receipt?.expires ?? Date.now() + 10000,
                      },
                    ])
                  }
                  readOnly={protectedView || props.actionsDisabled}
                  initialType={linkOperation.type}
                  sourceId={linkOperation.source}
                  targetId={linkOperation.target}
                  onBusyChange={setChangingLink}
                  onClose={() => {
                    setLinkOperation(null);
                    setChangingLink(false);
                  }}
                />
              )}
            </FieldsActions.Provider>
          </TaskActions.Provider>
        </GanttGestureContext.Provider>
      </GanttCalendarContext.Provider>
    </>
  );
}
