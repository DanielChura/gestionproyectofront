import { themeColor } from "../../utils/themePresentation";
import { useState } from "react";
import ChevronIcon from "../../../../shared/icons/ChevronIcon";
import FlagIcon from "../../../../shared/icons/FlagIcon";
import PlusIcon from "../../../../shared/icons/PlusIcon";
import { getIcon } from "../../../../shared/icons/icon-catalog";
import { getPriority } from "../../../../shared/priorities";
import { priorityTones } from "../../../../shared/priorityTones";
import QuickTaskRow from "../QuickTaskRow";
import type { Project, ProjectCatalogs, Task, TaskIdentity } from "../../types";

interface TaskSubtasksListProps {
  tasks: Task[];
  summary: { completed: number; total: number };
  projectId: number;
  project: Project;
  catalogs: ProjectCatalogs;
  parent: Task;
  onNavigate: (target: TaskIdentity) => void;
  onSubtaskCreated: (task: Task) => void;
}

export default function TaskSubtasksList({
  tasks,
  summary,
  projectId,
  project,
  catalogs,
  parent,
  onNavigate,
  onSubtaskCreated,
}: TaskSubtasksListProps) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const pending = summary.total - summary.completed;

  return (
    <section className="space-y-3 pt-1">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex cursor-pointer items-center gap-1.5 font-medium text-neutral-700 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <ChevronIcon
            className={`size-3.5 text-neutral-400 ${expanded ? "" : "-rotate-90"}`}
          />
          <span>Subtareas</span>
        </button>

        <span className="text-neutral-500 dark:text-neutral-400">
          {pending} sin resolver
        </span>
      </div>

      {expanded && (
        <div className="space-y-0.5">
          {tasks.map((item) => {
            const StateIcon = getIcon(item.state_tema?.icono);
            const priority = getPriority(item.priority);
            const tone =
              item.priority && priorityTones[item.priority]
                ? priorityTones[item.priority].text
                : "text-neutral-400";
            const color =
              themeColor(item.state_tema?.color ?? item.state_color) ??
              "#737373";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate({ projectId, taskId: item.id })}
                className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-md py-2 pl-4 pr-2 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    className="shrink-0"
                    style={{ color }}
                    title={item.state_name}
                  >
                    <StateIcon className="size-4" fill />
                  </span>
                  <span className="truncate text-neutral-700 dark:text-neutral-200">
                    {item.name}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <FlagIcon className={`size-3.5 shrink-0 ${tone}`} fill />
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {priority.label}
                    </span>
                  </span>

                  {item.state_name && (
                    <span
                      className="flex items-center gap-1.5 rounded px-2 py-0.5 text-xs text-neutral-100"
                      style={{ backgroundColor: color }}
                    >
                      <StateIcon className="size-3.5 shrink-0" fill />
                      <span>{item.state_name}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {parent.permissions.create_child &&
            (adding ? (
              <QuickTaskRow
                project={project}
                catalogs={catalogs}
                parent={parent}
                onCreated={(created) => {
                  onSubtaskCreated(created);
                  setAdding(false);
                }}
                onClose={() => setAdding(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex cursor-pointer items-center gap-2 rounded-md py-1.5 pl-4 pr-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:text-neutral-400"
              >
                <PlusIcon className="size-3.5" />
                <span>Añadir subtarea</span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
