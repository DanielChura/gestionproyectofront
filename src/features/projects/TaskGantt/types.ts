import type { Task, Project } from "../types";

export interface TaskGanttProps {
  project: Pick<Project, "id" | "start_date" | "end_date" | "task_states">;
  tasks: Task[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpenTask: (taskId: number) => void;
}

export interface GanttRow {
  id: number;
  parent: number;
  text: string;
  type: "task" | "gm-open-ended";
  open: boolean;
  start?: Date;
  end?: Date;
  duration?: number;
  gmHasChildren: boolean;
  gmParentId: number | null;
  gmStartDate: string;
  gmDueDate: string | null;
  gmStateName: string;
  gmCreatedAt: string;
  gmResponsible: string;
  gmContext?: boolean;
}
