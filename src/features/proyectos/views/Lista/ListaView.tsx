import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ChevronDownIcon from "../../../../shared/icons/ChevronIcon";
import PlusIcon from "../../../../shared/icons/PlusIcon";
import ProjectToolbar from "../../shared/ProjectToolbar";
import TaskDialog from "../../shared/task-dialog/TaskDialog";
import TaskStatusConfiguration from "../../shared/task-status/TaskStatusConfiguration/TaskStatusConfiguration";
import TaskStatusSettingsControl from "../../shared/task-status/TaskStatusSettingsControl";
import type {
  Project,
  Task,
  TaskActionKind,
  TaskDialogController,
  TaskListGroup,
} from "../../types";
import TaskGroupExpansionFilter from "../../components/filters/TaskGroupExpansionFilter";
import TaskGroupingFilter from "../../components/filters/TaskGroupingFilter";
import TaskSearchFilter from "../../components/filters/TaskSearchFilter";
import QuickTaskRow from "./components/QuickTaskRow";
import TaskGroupLabel from "./components/TaskGroupLabel";
import TaskRow from "./components/TaskTable/TaskRow";
import TaskTable from "./components/TaskTable/TaskTable";
import type { TaskChanges, TaskRowModel } from "./components/TaskTable/types";
import { useLista } from "./hooks/useLista";
import { useTaskGrouping } from "./hooks/useTaskGrouping";

interface ListaViewProps {
  project: Project;
  onProjectChange: Dispatch<SetStateAction<Project | null>>;
  initialCreate?: number;
  onCreateHandled?: () => void;
}

export default function ListaView({
  project,
  onProjectChange,
  initialCreate,
  onCreateHandled,
}: ListaViewProps) {
  const {
    tasks,
    catalogs,
    search,
    preferences,
    setGroupControls,
    setAction,
    acceptTask,
    patchTask,
    changeState,
    action,
    busy,
    saveTask,
    changeDependency,
    configuringStates,
    setConfiguringStates,
    configuredStates,
    setSearch,
    setPreferences,
    groupControls,
  } = useLista(project, onProjectChange, initialCreate, onCreateHandled);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedContext, setCollapsedContext] = useState<Set<string>>(
    new Set(),
  );
  const [draftGroup, setDraftGroup] = useState<string | null>(null);
  const pendingQuickTask = useRef(false);
  const listActive = useRef(false);

  useEffect(() => {
    listActive.current = true;
    return () => {
      listActive.current = false;
    };
  }, []);

  const listId = useId();
  const region = useRef<HTMLDivElement>(null);
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const states = project.task_states.states;
  const { hierarchy, groups } = useTaskGrouping(
    tasks,
    search,
    states,
    catalogs.priorities,
    preferences,
  );

  const changes: TaskChanges = { onPatch: patchTask, onState: changeState };
  const canConfigure =
    project.permissions.manage && project.task_states.can_configure;
  const canCreate = project.permissions.create_tasks;

  const dialog: TaskDialogController = {
    project,
    tasks,
    catalogs,
    action,
    busy,
    close: () => setAction(null),
    saveTask,
    changeState,
    changeDependency,
    configuredStates,
  };

  useEffect(() => {
    setGroupControls({
      expanded:
        groups.length > 0 && groups.every((group) => !collapsed.has(group.key)),
      disabled: groups.length === 0,
      controls: groups.map((_, index) => `${listId}-group-${index}`).join(" "),
      toggle: () =>
        setCollapsed((current) => {
          const next = new Set(current);
          const close = groups.every((group) => !current.has(group.key));
          for (const group of groups) {
            if (close) next.add(group.key);
            else next.delete(group.key);
          }
          return next;
        }),
    });
  }, [groups, collapsed, listId, setGroupControls]);

  useEffect(() => () => setGroupControls(null), [setGroupControls]);

  const canCreateIn = (code: string) =>
    project.permissions.create_tasks &&
    states.some((state) => state.code === code) &&
    (project.permissions.manage ||
      states.some(
        (state) =>
          state.code === code &&
          (state.category === "not_started" ||
            (!state.category && code === "PENDIENTE")),
      ));

  function onAction(kind: TaskActionKind, id: number) {
    setAction({ kind: kind === "detail" ? "edit" : kind, taskId: id });
  }

  function toggle(task: Task, context: boolean, contextKey: string) {
    if (context) {
      setCollapsedContext((current) => {
        const result = new Set(current);
        if (result.has(contextKey)) result.delete(contextKey);
        else result.add(contextKey);
        return result;
      });
    } else {
      setExpanded((current) => {
        const result = new Set(current);
        if (result.has(task.id)) result.delete(task.id);
        else result.add(task.id);
        return result;
      });
    }
  }

  function rows(
    items: Task[],
    group: TaskListGroup,
    depth = 0,
    ancestors = new Set<number>(),
  ): ReactNode[] {
    return items
      .filter((task) => group.visible.has(task.id) && !ancestors.has(task.id))
      .flatMap((task) => {
        const children = (hierarchy.children.get(task.id) ?? []).filter(
          (child) => group.visible.has(child.id),
        );
        const context = !group.members.has(task.id);
        const contextKey = `${group.key}:${task.id}`;
        const open =
          Boolean(search.trim()) ||
          (context ? !collapsedContext.has(contextKey) : expanded.has(task.id));
        const next = new Set([...ancestors, task.id]);
        if (context && preferences.mode === "state") {
          return rows(children, group, depth, next);
        }
        const row: TaskRowModel = {
          task,
          parent:
            task.parent_id === null ? undefined : byId.get(task.parent_id),
          depth,
          context,
          open,
          searching: Boolean(search.trim()),
          childCount: children.length,
          descendantCount:
            children.length > 0
              ? hierarchy.descendants(task.id, new Set(), group.visible)
              : 0,
        };
        return [
          <TaskRow
            key={task.id}
            row={row}
            data={{ project, catalogs, changes }}
            actions={{
              onToggle: () => toggle(task, context, contextKey),
              onOpen: () => onAction("detail", task.id),
            }}
          />,
          ...(open ? [rows(children, group, depth + 1, next)] : []),
        ];
      });
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <ProjectToolbar
        action={
          <div className="flex items-center gap-2">
            <TaskSearchFilter value={search} onChange={setSearch} />
            {canConfigure && (
              <TaskStatusSettingsControl
                onClick={() => setConfiguringStates(true)}
              />
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => setAction({ kind: "create" })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-100 dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200"
              >
                <PlusIcon className="size-4" />
                Agregar tarea
              </button>
            )}
          </div>
        }
      >
        <TaskGroupingFilter
          preferences={preferences}
          onChange={setPreferences}
        />
        <TaskGroupExpansionFilter
          expanded={groupControls?.expanded ?? false}
          disabled={groupControls?.disabled ?? true}
          controls={groupControls?.controls ?? ""}
          onToggle={() => groupControls?.toggle()}
        />
      </ProjectToolbar>

      {hierarchy.roots.length === 0 && !search.trim() && (
        <p className="my-4 text-xs text-neutral-500 dark:text-neutral-400">
          No hay tareas visibles. Crea una tarea para comenzar si tienes
          permiso.
        </p>
      )}

      <div
        ref={region}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-auto pb-6"
      >
        {groups.map((group, index) => {
          const open = !collapsed.has(group.key);
          const groupId = `${listId}-group-${index}`;
          const canCreateGroup = group.stateCode
            ? canCreateIn(group.stateCode)
            : project.permissions.create_tasks;

          return (
            <section
              className="relative mb-2"
              key={group.key}
              data-group-key={group.key}
            >
              <h2 className="sticky top-0 z-10 mb-1 px-3 py-1 text-xs">
                <button
                  type="button"
                  className="sticky left-0 inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-800 dark:text-neutral-100"
                  aria-expanded={open}
                  aria-controls={groupId}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                >
                  <ChevronDownIcon
                    className={`size-4 ${open ? "" : "-rotate-90"}`}
                    fill
                  />
                  {group.stateCode ? (
                    <>
                      <span
                        className="inline-flex items-center rounded-lg px-2 py-1 text-xs text-neutral-100"
                        style={{
                          backgroundColor: group.stateColor ?? "#737373",
                        }}
                      >
                        <TaskGroupLabel group={group} mode={preferences.mode} />
                      </span>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {group.members.size}{" "}
                        {group.members.size === 1 ? "tarea" : "tareas"}
                      </span>
                    </>
                  ) : (
                    <>
                      <TaskGroupLabel group={group} mode={preferences.mode} />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {group.members.size}{" "}
                        {group.members.size === 1 ? "tarea" : "tareas"}
                      </span>
                    </>
                  )}
                </button>
              </h2>

              <div id={groupId} hidden={!open} className="pl-8">
                <TaskTable groupName={group.name}>
                  {rows(group.roots, group)}
                </TaskTable>

                {canCreateGroup && draftGroup === group.key ? (
                  <QuickTaskRow
                    key={`${project.id}:${group.key}`}
                    project={project}
                    catalogs={catalogs}
                    groupCode={group.stateCode}
                    onCreated={acceptTask}
                    savingRef={pendingQuickTask}
                    onClose={(returnFocus = true) => {
                      setDraftGroup(null);
                      if (returnFocus) {
                        requestAnimationFrame(() =>
                          document
                            .getElementById(
                              `${listId}-${encodeURIComponent(group.key)}-create`,
                            )
                            ?.focus({ preventScroll: true }),
                        );
                      }
                    }}
                    onDetachedCreated={(task) => {
                      if (listActive.current) {
                        setDraftGroup(null);
                        acceptTask(task);
                      }
                    }}
                  />
                ) : (
                  canCreateGroup && (
                    <button
                      id={`${listId}-${encodeURIComponent(group.key)}-create`}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100"
                      type="button"
                      onClick={() => {
                        if (!pendingQuickTask.current) setDraftGroup(group.key);
                      }}
                    >
                      <PlusIcon className="size-4" /> Añadir tarea
                    </button>
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>

      <TaskDialog controller={dialog} />
      {configuringStates && (
        <TaskStatusConfiguration
          project={project}
          onConfigured={configuredStates}
          onClose={() => setConfiguringStates(false)}
        />
      )}
    </section>
  );
}
