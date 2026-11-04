import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TaskGanttProps } from "./types";
import { useRelationMutation } from "../TaskDetail/useTaskRelations";
import { useTaskSync } from "../useTaskSync";
import { getTaskDetail } from "../services";
import type { Task } from "../types";

export function useGanttLinks(props: TaskGanttProps, source?: Task) {
  const sync = useTaskSync();
  const current = useRef(props);
  useLayoutEffect(() => { current.current = props; });
  const [unconfirmed, setUnconfirmed] = useState<number | null>(null);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reconcile = useCallback(async (id: number) => {
    const projectId = current.current.project.id;
    setUnconfirmed(id);
    const detail = await sync.read(() => getTaskDetail({ projectId, taskId: id }));
    if (!alive.current || !sync.isCurrent() || current.current.project.id !== projectId) return;
    current.current.onCreated(sync.confirm(detail.task));
    setUnconfirmed(null);
  }, [sync]);
  const mutation = useRelationMutation({ projectId: props.project.id, taskId: source?.id ?? 0 }, reconcile);
  return { ...mutation, unconfirmed, reconcile };
}
