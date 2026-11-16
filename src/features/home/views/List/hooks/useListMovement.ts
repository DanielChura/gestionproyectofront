import type { RefObject } from "react";
import type { Project, Task, TaskListGroup } from "../../../types";
import { useTaskMove } from "../../../hooks/useTaskMove";
import { useTaskPointerDrag } from "../../../hooks/useTaskPointerDrag";
import { listDropDestination } from "../utils/listDropDestination";

export function useListMovement(options: {
  project: Project;
  tasks: Task[];
  groups: TaskListGroup[];
  byId: Map<number, Task>;
  rootById: Map<number, Task>;
  mode: string;
  search: string;
  region: RefObject<HTMLDivElement | null>;
  onMoved: (tasks: Task[]) => void;
}) {
  const movement = useTaskMove(options.project, options.onMoved, options.region, options.tasks);
  function locate(x: number, y: number, task: Task) {
    if (!options.region.current || options.mode !== "state" || options.search.trim()) return null;
    const destination = listDropDestination({ ...options, region: options.region.current }, x, y, task);
    return destination && movement.permitted(task, destination.state) ? destination : null;
  }
  const pointerDrag = useTaskPointerDrag({ movement, locate, region: options.region });
  return { movement, pointerDrag };
}
