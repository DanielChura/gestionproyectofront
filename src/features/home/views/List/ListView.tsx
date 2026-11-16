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
import MyTasksToggle from "../../shared/MyTasksToggle";
import QuickTaskRow from "../../shared/QuickTaskRow";
import TaskGroupLabel from "./components/TaskGroupLabel";
import TaskRow from "./components/TaskTable/TaskRow";
import TaskTable from "./components/TaskTable/TaskTable";
import type { TaskChanges, TaskRowModel } from "./components/TaskTable/types";
import { useList } from "./hooks/useList";
import { useMyTasksFilter } from "../../hooks/useMyTasksFilter";
import { useTaskGrouping } from "../../hooks/useTaskGrouping";

interface ListViewProps {
  project: Project;
  onProjectChange: Dispatch<SetStateAction<Project | null>>;
  initialCreate?: number;
  onCreateHandled?: () => void;
  initialTaskId?: number;
}

export default function ListView({
  project,
  onProjectChange,
  initialCreate,
  onCreateHandled,
  initialTaskId,
}: ListViewProps) {
  const {
    tasks,
    error,
    refetch,
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
  } = useList(
    project,
    onProjectChange,
    initialCreate,
    onCreateHandled,
    initialTaskId,
  );

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

  const myTasks = useMyTasksFilter(tasks);

  const states = project.task_states?.states;
  const { hierarchy, groups } = useTaskGrouping(
    myTasks.tasks,
    search,
    states ?? [],
    catalogs.priorities,
    preferences,
  );

  const visibleGroups = useMemo(
    () => groups.filter((group) => group.members.size > 0),
    [groups],
  );

  const changes: TaskChanges = { onPatch: patchTask, onState: changeState };
  const canConfigure =
    project.permissions.manage && (project.task_states?.can_configure ?? false);
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

  const groupsRef = useRef(visibleGroups);
  useEffect(() => { groupsRef.current = visibleGroups; });
  const groupKeys = visibleGroups.map((group) => group.key).join("|");

  useEffect(() => {
    const currentGroups = groupsRef.current;
    setGroupControls({
      expanded:
        currentGroups.length > 0 &&
        currentGroups.every((group) => !collapsed.has(group.key)),
      disabled: currentGroups.length === 0,
      controls: currentGroups
        .map((_, index) => `${listId}-group-${index}`)
        .join(" "),
      toggle: () =>
        setCollapsed((current) => {
          const next = new Set(current);
          const close = currentGroups.every((group) => !current.has(group.key));
          for (const group of currentGroups) {
            if (close) next.add(group.key);
            else next.delete(group.key);
          }
          return next;
        }),
    });
  }, [groupKeys, collapsed, listId, setGroupControls]);

  useEffect(() => () => setGroupControls(null), [setGroupControls]);

  const canCreateIn = (code: string) =>
    project.permissions.create_tasks &&
    (states ?? []).some((state) => state.code === code) &&
    (project.permissions.manage ||
      (states ?? []).some(
        (state) =>
          state.code === code &&
          (state.category === "not_started" ||
            (!state.category && code === "PENDIENTE")),
      ));

  function onAction(kind: TaskActionKind, id: number) {
    setAction({ kind, taskId: id });
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
            <MyTasksToggle
              user={myTasks.user}
              active={myTasks.mine}
              onToggle={myTasks.toggleMine}
            />
            {canCreate && (
              <button
                type="button"
                aria-label="Crear nueva tarea"
                onClick={() => setAction({ kind: "create" })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
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
          onToggle={() => groupControls?.toggle()}
        />
        <TaskSearchFilter mode="button" value={search} onChange={setSearch} />
        {canConfigure && (
          <TaskStatusSettingsControl
            onClick={() => setConfiguringStates(true)}
          />
        )}
      </ProjectToolbar>

      {hierarchy.roots.length === 0 && !search.trim() && (
        <p className="my-4 text-xs text-neutral-500 dark:text-neutral-400">
          No hay tareas visibles. Crea una tarea para comenzar si tienes
          permiso.
        </p>
      )}

      {error && <p role="alert" className="px-3 text-xs text-red-600 dark:text-red-400">{error} <button type="button" className="cursor-pointer underline" onClick={() => void refetch()}>Actualizar lista</button></p>}
      <div
        ref={region}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-auto pb-6"
      >
        {visibleGroups.map((group, index) => {
          const open = !collapsed.has(group.key);
          const groupId = `${listId}-group-${index}`;
          const groupState = group.stateCode
            ? (states ?? []).find((s) => s.code === group.stateCode)
            : undefined;
          const canCreateGroup = group.stateCode
            ? canCreateIn(group.stateCode)
            : project.permissions.create_tasks;

          return (
            <section
              className="relative mb-8"
              key={group.key}
              data-group-key={group.key}
            >
              <h2 className="sticky top-0 z-10 mb-1 px-3 py-1 text-xs">
                <button
                  type="button"
                  className="sticky left-0 inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-400"
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
                    <span
                      style={{
                        backgroundColor:
                          groupState?.tema?.color ??
                          group.stateColor ??
                          "#525252",
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs  text-white"
                    >
                      <TaskGroupLabel
                        group={group}
                        mode={preferences.mode}
                        state={groupState}
                      />
                    </span>
                  ) : (
                    <TaskGroupLabel group={group} mode={preferences.mode} />
                  )}

                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {group.members.size}
                  </span>
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

        <TaskDialog controller={dialog} onUpdated={acceptTask} />

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
