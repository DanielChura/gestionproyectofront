import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import type {
  Task,
  TaskActionKind,
  Project,
  ProjectCatalogs,
  TaskStatePayload,
} from "../types";
import { formatTaskDate } from "../TaskList/taskHierarchy";
import FlagIcon from "../../../shared/icons/FlagIcon";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import { taskAssignees } from "../taskAssignees";
import { stateInk } from "../TaskList/stateInk";

interface TaskBoardProps {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}

const priorityName = (catalogs: ProjectCatalogs, code: number | null) =>
  code == null
    ? "Sin prioridad"
    : (catalogs.priorities.find((item) => item.code === code)?.name ??
      String(code));

function Card({
  task,
  catalogs,
  onAction,
  draggable,
  childCount,
  expanded = false,
  onToggleChildren,
  childrenTasks,
  childrenMap,
  overlay = false,
}: {
  task: Task;
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  draggable?: boolean;
  childCount?: number;
  expanded?: boolean;
  onToggleChildren?: (id: number) => void;
  childrenTasks?: Task[];
  childrenMap?: Map<number, Task[]>;
  overlay?: boolean;
}) {
  const resolvedChildCount =
    childCount ?? childrenMap?.get(task.id)?.length ?? 0;
  const resolvedChildren = childrenTasks ?? childrenMap?.get(task.id) ?? [];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: overlay ? `preview-${task.id}` : task.id,
    data: { task },
    disabled: !draggable,
  });
  const style = {
    transform: undefined,
    opacity: isDragging ? 0 : 1,
  };
  const people = taskAssignees(task);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 text-xs rounded-lg cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800"
      onClick={() => onAction("detail", task.id)}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      role="button"
      tabIndex={0}
      aria-label={task.name}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onAction("detail", task.id);
        } else listeners?.onKeyDown?.(event);
      }}
    >
      <div className=" text-neutral-800 dark:text-neutral-100 leading-snug">
        {task.name}
      </div>
      {people.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 truncate">
          <span className="inline-grid place-items-center size-4 rounded-full bg-sky-700 text-white text-[9px]  shrink-0">
            {people[0].name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">
            {people.map((person) => person.name).join(", ")}
          </span>
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {task.priority != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px]  rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <FlagIcon className="size-3.5" />
            {priorityName(catalogs, task.priority)}
          </span>
        )}
        {task.due_date && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px]  rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <CalendarIcon className="size-3.5" />
            {formatTaskDate(task.due_date)}
          </span>
        )}
        {task.labels.slice(0, 3).map((label) => (
          <span
            key={label.id}
            className="px-2 py-0.5 text-[10px]  rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100"
          >
            {label.name}
          </span>
        ))}
        {task.labels.length > 3 && (
          <span className="px-2 py-0.5 text-[10px]  rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            +{task.labels.length - 3}
          </span>
        )}
      </div>
      {resolvedChildCount > 0 && (
        <div className="mt-1.5">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1 rounded p-0.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:text-neutral-100 dark:hover:text-neutral-100"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Contraer" : "Expandir"} subtareas de ${task.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleChildren?.(task.id);
            }}
          >
            <span
              className={expanded ? "[transform:rotate(90deg)]" : undefined}
            >
              <ChevronDownIcon className="size-4 -rotate-90" />
            </span>
            <span className="text-[10px] ">{resolvedChildCount}</span>
          </button>
          {expanded && resolvedChildren.length > 0 && (
            <div className="mt-2 space-y-2 border-l border-neutral-200 dark:border-neutral-800 pl-2">
              {resolvedChildren.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-800"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAction("detail", child.id);
                  }}
                >
                  <span className="truncate">{child.name}</span>
                  <span className="shrink-0 text-[10px] text-neutral-600 dark:text-neutral-400">
                    {child.state_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Column({
  state,
  tasks,
  catalogs,
  onAction,
  isOver,
  childrenMap,
  expandedParents,
  onToggleChildren,
}: {
  state: { code: string; name: string; color?: string; category?: string };
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (kind: TaskActionKind, id: number) => void;
  isOver: boolean;
  childrenMap: Map<number, Task[]>;
  expandedParents: Set<number>;
  onToggleChildren: (id: number) => void;
}) {
  const { setNodeRef } = useDroppable({ id: state.code });
  const headerColor = state.color;
  const softBg = headerColor ? `${headerColor}14` : "#f5f5f5";
  return (
    <section
      ref={setNodeRef}
      style={{ backgroundColor: softBg }}
      className={`flex flex-col min-w-[260px] w-[300px] shrink-0 rounded-xl p-2 ${
        isOver ? "ring-2 ring-neutral-400" : ""
      }`}
      aria-label={state.name}
    >
      <header className="flex shrink-0 items-center gap-2 px-2 py-1.5">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs "
          style={
            headerColor
              ? { backgroundColor: headerColor, color: stateInk(headerColor) }
              : { backgroundColor: "#e5e5e5", color: "#404040" }
          }
        >
          {headerColor && (
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: stateInk(headerColor) }}
              aria-hidden="true"
            />
          )}
          {state.name}
        </div>
        <span className="text-[10px]  text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900/70 px-1.5 py-0.5 rounded">
          {tasks.length}
        </span>
      </header>
      <div className="board-column-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            catalogs={catalogs}
            onAction={onAction}
            draggable={task.permissions.state}
            childCount={childrenMap.get(task.id)?.length ?? 0}
            expanded={expandedParents.has(task.id)}
            onToggleChildren={onToggleChildren}
            childrenTasks={childrenMap.get(task.id) ?? []}
            childrenMap={childrenMap}
          />
        ))}
      </div>
    </section>
  );
}

export default function TaskBoard({
  project,
  tasks,
  catalogs,
  onAction,
  onState,
}: TaskBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expandedParents, setExpandedParents] = useState<Set<number>>(
    new Set(),
  );
  const toggleParent = (id: number) =>
    setExpandedParents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const states = project.task_states.states;
  const byState = new Map(states.map((state) => [state.code, [] as Task[]]));
  for (const task of tasks) {
    const bucket = byState.get(task.state_code);
    if (bucket) bucket.push(task);
    else {
      // unknown state: put in first column fallback
      if (states[0]) byState.get(states[0].code)?.push(task);
    }
  }

  const childrenMap = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const task of tasks) {
      if (
        task.parent_id !== null &&
        tasks.some((item) => item.id === task.parent_id)
      ) {
        const branch = map.get(task.parent_id) ?? [];
        branch.push(task);
        map.set(task.parent_id, branch);
      }
    }
    return map;
  }, [tasks]);

  const activeTask =
    activeId != null ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
    setError("");
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);
      if (!over) return;
      const taskId = Number(active.id);
      const target = String(over.id);
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.state_code === target) return;
      if (!task.permissions.state) return;
      const transition = task.transitions.find(
        (item) => item.target === target,
      );
      if (!transition) return;
      try {
        await onState(task, { state_code: target });
      } catch (failure) {
        setError(String(failure));
      }
    },
    [tasks, onState],
  );

  const handleBoardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (event.shiftKey || !boardRef.current) return;
    const col = (event.target as HTMLElement).closest?.(".board-column-scroll");
    if (col) {
      const { scrollTop, scrollHeight, clientHeight } = col;
      const canScrollDown =
        event.deltaY > 0 && scrollTop + clientHeight < scrollHeight - 1;
      const canScrollUp = event.deltaY < 0 && scrollTop > 1;
      if (canScrollDown || canScrollUp) return;
    }
    if (event.deltaY !== 0) {
      boardRef.current.scrollLeft += event.deltaY;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <p className="mb-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
        onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
      >
        <div
          ref={boardRef}
          onWheel={handleBoardWheel}
          className="flex min-h-0 flex-1 gap-3 overflow-x-auto"
        >
          {states.map((state) => (
            <Column
              key={state.code}
              state={state}
              tasks={byState.get(state.code) ?? []}
              catalogs={catalogs}
              onAction={onAction}
              isOver={overId === state.code}
              childrenMap={childrenMap}
              expandedParents={expandedParents}
              onToggleChildren={toggleParent}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[300px]">
              <Card
                task={activeTask}
                catalogs={catalogs}
                onAction={onAction}
                draggable={false}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
