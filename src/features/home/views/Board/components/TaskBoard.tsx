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
  TaskGroupingPreferences,
  TaskListGroup,
  TaskPatchPayload,
  TaskStatePayload,
} from "../../../types";
import TaskBoardCard, { type TaskCardView } from "./TaskBoardCard";
import TaskBoardColumn from "./TaskBoardColumn";

interface TaskBoardProps {
  project: Project;
  tasks: Task[];
  groups: TaskListGroup[];
  preferences: TaskGroupingPreferences;
  catalogs: ProjectCatalogs;
  expandedParents: Set<number>;
  onToggleParent: (id: number) => void;
  onAction: (
    kind: TaskActionKind | "create",
    id: number,
    extra?: { stateCode?: string },
  ) => void;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
  onPatch: (task: Task, data: TaskPatchPayload) => Promise<void>;
}

export default function TaskBoard({
  project,
  tasks,
  groups,
  preferences,
  catalogs,
  expandedParents,
  onToggleParent,
  onAction,
  onState,
  onPatch,
}: TaskBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const states = project.task_states.states;
  const stateByCode = useMemo(
    () => new Map(states.map((state) => [state.code, state])),
    [states],
  );
  const stateGrouping = preferences.mode === "state";

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

  const byGroup = useMemo(
    () =>
      new Map(
        groups.map((group) => [
          group.key,
          tasks.filter((task) => group.members.has(task.id)),
        ]),
      ),
    [groups, tasks],
  );

  const activeTask = activeId != null ? (taskById.get(activeId) ?? null) : null;
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
    onToggleChildren: onToggleParent,
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
      if (!stateGrouping || !over) return;
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
    [stateGrouping, taskById, onState],
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
          {groups.map((group) => {
            const state = group.stateCode
              ? stateByCode.get(group.stateCode)
              : undefined;
            return (
              <TaskBoardColumn
                key={group.key}
                group={group}
                state={state}
                mode={preferences.mode}
                tasks={byGroup.get(group.key) ?? []}
                taskById={taskById}
                view={view}
                isOver={Boolean(
                  stateGrouping && state && overId === state.code,
                )}
                droppable={stateGrouping && Boolean(state)}
                canCreate={
                  stateGrouping &&
                  Boolean(state) &&
                  project.permissions.create_tasks
                }
              />
            );
          })}
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
