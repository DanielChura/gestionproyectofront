import { useDraggable } from "@dnd-kit/core";
import type {
  EditTaskPayload,
  Project,
  TaskPatchPayload,
  ProjectCatalogs,
  Task,
  TaskActionKind,
} from "../../../types";
import AssigneePopup from "../../../shared/task-popups/AssigneePopup";
import DueDatePopup from "../../../shared/task-popups/DueDatePopup";
import LabelPopup from "../../../shared/task-popups/LabelPopup";
import PriorityPopup from "../../../shared/task-popups/PriorityPopup";
import VectorIcon from "../../../../../shared/icons/VectorIcon";

export interface TaskCardView {
  project: Project;
  catalogs: ProjectCatalogs;
  childrenMap: Map<number, Task[]>;
  expandedParents: Set<number>;
  onAction: (
    kind: TaskActionKind | "create",
    id: number,
    extra?: Record<string, unknown>,
  ) => void;
  onPatch: (task: Task, data: TaskPatchPayload) => Promise<void>;
  onToggleChildren: (id: number) => void;
}

interface TaskBoardCardProps {
  task: Task;
  view: TaskCardView;
  parent?: Task;
  draggable?: boolean;
  nested?: boolean;
  overlay?: boolean;
  dragPrefix?: string;
}

const stop = (e: { stopPropagation(): void }) => e.stopPropagation();

export default function TaskBoardCard({
  task,
  view,
  parent,
  draggable = false,
  nested = false,
  overlay = false,
  dragPrefix,
}: TaskBoardCardProps) {
  const {
    project,
    catalogs,
    childrenMap,
    expandedParents,
    onAction,
    onPatch,
    onToggleChildren,
  } = view;
  const children = overlay ? [] : (childrenMap.get(task.id) ?? []);
  const expanded = expandedParents.has(task.id);

  const dragId = dragPrefix ? `${dragPrefix}:${task.id}` : String(task.id);
  const { listeners, setNodeRef } = useDraggable({
    id: nested ? `nested-${dragId}` : overlay ? `preview-${task.id}` : dragId,
    data: { task },
    disabled: overlay || !draggable,
  });

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onAction("detail", task.id);
        }}
        className={`rounded-xl border border-neutral-200 bg-white p-1.5 text-xs dark:border-neutral-800 dark:bg-neutral-900 ${
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        } ${overlay ? "w-70" : ""}`}
      >
        <div className="px-1 py-1 text-sm font-medium text-neutral-800 dark:text-neutral-100 line-clamp-2">
          {task.name}
        </div>

        <div
          className="flex flex-wrap items-center gap-1 p-1"
          onPointerDown={stop}
          onClick={stop}
        >
          <AssigneePopup project={project} task={task} onPatch={onPatch} />
          <DueDatePopup
            project={project}
            task={task}
            parent={parent}
            onPatch={onPatch}
          />
          <PriorityPopup catalogs={catalogs} task={task} onPatch={onPatch} />
          <LabelPopup catalogs={catalogs} task={task} onPatch={onPatch} />
        </div>

        {children.length > 0 && (
          <button
            type="button"
            className="inline-flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              onToggleChildren(task.id);
            }}
          >
            <VectorIcon className="size-4" />
            <span>
              {children.length}{" "}
              {children.length === 1 ? "subtarea" : "subtareas"}
            </span>
          </button>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="space-y-2 pl-3">
          {children.map((child) => (
            <TaskBoardCard
              key={child.id}
              task={child}
              view={view}
              parent={task}
              nested
              dragPrefix={dragPrefix}
            />
          ))}
        </div>
      )}
    </>
  );
}
