import { useRef, useSyncExternalStore } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionVersion, errorText } from "../../../../core/api/httpClient";
import { useToast } from "../../../../hooks/useToast";
import {
  changeTaskState,
  getTaskActivity,
  getTaskDetail,
  getTaskRelations,
  getTaskSubtasks,
} from "../../services";
import { useTaskSync } from "../../utils/useTaskSync";
import type {
  Task,
  TaskIdentity,
  TaskPatchPayload,
  TaskStatePayload,
} from "../../types";

export function useTaskDetail(
  target: TaskIdentity,
  onUpdated?: (task: Task) => void,
  includeRelations = true,
) {
  const sync = useTaskSync();
  useSyncExternalStore(sync.subscribe, sync.getVersion, sync.getVersion);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const epoch = sessionVersion();
  const detailKey = ["task", epoch, target.projectId, target.taskId];
  const subtasksKey = ["task-subtasks", epoch, target.projectId, target.taskId];
  const activityKey = ["task-activity", epoch, target.projectId, target.taskId];
  const relationsKey = [
    "task-relations",
    epoch,
    target.projectId,
    target.taskId,
  ];
  const pending = useRef(false);
  async function readCurrent<T>(load: () => Promise<T>): Promise<T> {
    // The workspace activates after its children mount. Capture its lifetime afterwards.
    await Promise.resolve();
    return sync.read(load);
  }
  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: async () => {
      const result = await readCurrent(() => getTaskDetail(target));
      return {
        task: sync.observe(result.task),
        parent: result.parent ? sync.observe(result.parent) : null,
      };
    },
    retry: false,
  });
  const subtasksQuery = useInfiniteQuery({
    queryKey: subtasksKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await readCurrent(() => getTaskSubtasks(target, pageParam));
      return { ...page, items: sync.observeMany(page.items) };
    },
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    retry: false,
  });
  const activityQuery = useInfiniteQuery({
    queryKey: activityKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readCurrent(() => getTaskActivity(target, pageParam)),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    retry: false,
  });
  const relationsQuery = useInfiniteQuery({
    enabled: includeRelations,
    queryKey: relationsKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      readCurrent(() => getTaskRelations(target, pageParam)),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    retry: false,
  });
  function accept(incoming: Task) {
    if (!sync.isCurrent()) return;
    const saved = sync.current(incoming);
    queryClient.setQueryData(
      detailKey,
      (previous: { task: Task; parent: Task | null } | undefined) =>
        previous ? { ...previous, task: saved } : previous,
    );
    void queryClient.invalidateQueries({ queryKey: activityKey });
    onUpdated?.(saved);
  }
  function notifyError(failure: unknown) {
    if (sync.isCurrent())
      addToast({
        icon: "error",
        title: "No se pudo guardar la tarea",
        message: errorText(failure),
      });
  }
  async function mutate(
    task: Task,
    payload: TaskPatchPayload | TaskStatePayload,
  ) {
    if (pending.current) throw new Error("Espera a que termine el guardado.");
    pending.current = true;
    try {
      const saved =
        "state_code" in payload
          ? sync.confirm(
              await changeTaskState(target.projectId, task.id, payload),
            )
          : await sync.patch(task.id, payload);
      if (task.id === target.taskId) accept(saved);
      else if (sync.isCurrent()) onUpdated?.(sync.current(saved));
      return saved;
    } finally {
      pending.current = false;
    }
  }
  const mutation = useMutation({
    mutationFn: ({
      task,
      payload,
    }: {
      task: Task;
      payload: TaskPatchPayload | TaskStatePayload;
    }) => mutate(task, payload),
    onError: notifyError,
    retry: false,
  });
  async function onSubtaskCreated(created: Task) {
    if (!sync.isCurrent()) return;
    onUpdated?.(sync.confirm(created));
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: subtasksKey }),
      queryClient.invalidateQueries({ queryKey: activityKey }),
      queryClient.invalidateQueries({ queryKey: detailKey }),
    ]);
  }
  async function relationsChanged(otherId: number) {
    await Promise.all([relationsQuery.refetch(), activityQuery.refetch()]);
    const results = await sync.read(() =>
      Promise.all(
        [...new Set([target.taskId, otherId])].map((taskId) =>
          getTaskDetail({ projectId: target.projectId, taskId }),
        ),
      ),
    );
    for (const result of results) {
      const saved = sync.observe(result.task);
      if (saved.id === target.taskId) accept(saved);
      else onUpdated?.(saved);
    }
  }
  const task = detailQuery.data
    ? sync.current(detailQuery.data.task)
    : undefined;
  return {
    task,
    parent: detailQuery.data?.parent
      ? sync.current(detailQuery.data.parent)
      : null,
    subtasks:
      subtasksQuery.data?.pages
        .flatMap((page) => page.items)
        .map(sync.current) ?? [],
    subtasksSummary: {
      completed: subtasksQuery.data?.pages[0]?.completed ?? 0,
      total: subtasksQuery.data?.pages[0]?.total ?? 0,
    },
    activities:
      activityQuery.data?.pages.flatMap((page) =>
        page.items.flatMap((group) => group.events),
      ) ?? [],
    loading: detailQuery.isPending,
    error: detailQuery.error ? errorText(detailQuery.error) : "",
    retry: detailQuery.refetch,
    busy: mutation.isPending,
    childrenError: subtasksQuery.error ? errorText(subtasksQuery.error) : "",
    retryChildren: subtasksQuery.refetch,
    moreChildren: !!subtasksQuery.hasNextPage,
    loadingChildren: subtasksQuery.isFetchingNextPage,
    loadChildren: subtasksQuery.fetchNextPage,
    activityError: activityQuery.error ? errorText(activityQuery.error) : "",
    retryActivity: activityQuery.refetch,
    moreActivity: !!activityQuery.hasNextPage,
    loadingActivity: activityQuery.isFetchingNextPage,
    loadActivity: activityQuery.fetchNextPage,
    relations: {
      value: relationsQuery.data
        ? {
            ...relationsQuery.data.pages[0],
            items: relationsQuery.data.pages.flatMap((page) => page.items),
            next_cursor: relationsQuery.hasNextPage
              ? relationsQuery.data.pages.at(-1)!.next_cursor
              : null,
          }
        : null,
      loading: relationsQuery.isPending,
      error: relationsQuery.error ? errorText(relationsQuery.error) : "",
      moreBusy: relationsQuery.isFetchingNextPage,
      loadMore: async () => {
        if (!relationsQuery.isFetching) await relationsQuery.fetchNextPage();
      },
      refresh: () => {
        void relationsQuery.refetch();
      },
    },
    relationsChanged,
    onSubtaskCreated,
    acceptTask: accept,
    patchTask: async (patch: TaskPatchPayload) => {
      if (!task) throw new Error("Consulta la tarea antes de editar.");
      await mutation.mutateAsync({ task, payload: patch });
    },
    onPatch: async (item: Task, patch: TaskPatchPayload) => {
      await mutation.mutateAsync({ task: item, payload: patch });
    },
    onState: async (item: Task, state: TaskStatePayload) => {
      await mutation.mutateAsync({ task: item, payload: state });
    },
  };
}
