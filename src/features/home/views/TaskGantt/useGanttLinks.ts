import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { TaskGanttProps } from "./types";
import { useRelationMutation } from "../../hooks/useTaskRelations";
import { useTaskSync } from "../../utils/useTaskSync";
import type { Task } from "../../types";
import { getTaskDetail } from "../../services";
export function useGanttLinks(props: TaskGanttProps, source?: Task) {
  const sync = useTaskSync();
  const current = useRef(props);
  useLayoutEffect(() => {
    current.current = props;
  });
  const [unconfirmed, setUnconfirmed] = useState<number | null>(null);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const reconcile = useCallback(
    async (id: number) => {
      const projectId = current.current.project.id;
      setUnconfirmed(id);
      const affected = [
        ...new Set(
          [id, source?.id].filter(
            (taskId): taskId is number => taskId !== undefined,
          ),
        ),
      ];
      const details = await sync.read(() =>
        Promise.all(
          affected.map((taskId) => getTaskDetail({ projectId, taskId })),
        ),
      );
      if (
        !alive.current ||
        !sync.isCurrent() ||
        current.current.project.id !== projectId
      )
        return;
      for (const task of sync.confirmMany(details.map((detail) => detail.task)))
        current.current.onCreated(task);
      setUnconfirmed(null);
    },
    [sync, source?.id],
  );
  const mutation = useRelationMutation(
    { projectId: props.project.id, taskId: source?.id ?? 0 },
    reconcile,
  );
  return { ...mutation, unconfirmed, reconcile };
}
