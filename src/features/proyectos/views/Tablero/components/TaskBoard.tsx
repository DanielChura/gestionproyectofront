import { useCallback, useMemo, useRef, useState, type WheelEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import type {
  EditTaskPayload,
  Project,
  ProjectCatalogs,
  Task,
  TaskActionKind,
  TaskStatePayload,
} from "../../../types";
import TaskBoardCard, { type TaskCardView } from "./TaskBoardCard";
import TaskBoardColumn from "./TaskBoardColumn";

interface TaskBoardProps {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  onAction: (
    kind: TaskActionKind | "create",
    id: number,
    extra?: { stateCode?: string },
  ) => void;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
}

export default function TaskBoard({
  project,
  tasks,
  catalogs,
  onAction,
  onState,
  onPatch,
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
  );

  const states = project.task_states.states;
  const byState = new Map(states.map((state) => [state.code, [] as Task[]]));
  for (const task of tasks) {
    const bucket = byState.get(task.state_code);
    if (bucket) bucket.push(task);
    else if (states[0]) byState.get(states[0].code)?.push(task);
  }

  const visibleStates =
    activeId === null
      ? states.filter((state) => (byState.get(state.code)?.length ?? 0) > 0)
      : states;

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const childrenMap = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const task of tasks) {
      if (task.parent_id !== null && taskById.has(task.parent_id)) {
        const branch = map.get(task.parent_id) ?? [];
        branch.push(task);
        map.set(task.parent_id, branch);
      }
    }
    return map;
  }, [tasks, taskById]);

  const activeTask =
    activeId != null ? (taskById.get(activeId) ?? null) : null;
  const activeParent =
    activeTask?.parent_id != null
      ? taskById.get(activeTask.parent_id)
      : undefined;

  const view: TaskCardView = {
    project,
    catalogs,
    childrenMap,
    expandedParents,
    onAction: (...args) => onAction(...args),
    onPatch,
    onToggleChildren: toggleParent,
  };

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
      const task = taskById.get(taskId);
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
    [taskById, onState],
  );

  const handleBoardWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (event.shiftKey || !boardRef.current) return;
    const column = (event.target as HTMLElement).closest?.(
      ".board-column-scroll",
    );
    if (column) {
      const { scrollTop, scrollHeight, clientHeight } = column;
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
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
        }}
        onDragOver={(event) =>
          setOverId(event.over ? String(event.over.id) : null)
        }
      >
        <div
          ref={boardRef}
          onWheel={handleBoardWheel}
          className="flex min-h-0 flex-1 items-start gap-3 overflow-x-scroll"
        >
          {visibleStates.map((state) => (
            <TaskBoardColumn
              key={state.code}
              state={state}
              tasks={byState.get(state.code) ?? []}
              taskById={taskById}
              view={view}
              isOver={overId === state.code}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskBoardCard
              task={activeTask}
              view={view}
              parent={activeParent}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
