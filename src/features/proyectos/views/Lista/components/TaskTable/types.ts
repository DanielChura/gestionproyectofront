import type {
  EditTaskPayload,
  Project,
  ProjectCatalogs,
  Task,
  TaskStatePayload,
} from "../../../../types";

export interface TaskChanges {
  onPatch: (task: Task, data: Partial<EditTaskPayload>) => Promise<void>;
  onState: (task: Task, data: TaskStatePayload) => Promise<void>;
}

export interface TaskFieldView extends TaskChanges {
  task: Task;
  project: Project;
  catalogs: ProjectCatalogs;
  parent?: Task;
}

export interface TaskRowModel {
  task: Task;
  parent?: Task;
  depth: number;
  context: boolean;
  open: boolean;
  searching: boolean;
  childCount: number;
  descendantCount: number;
}

export interface TaskRowData {
  project: Project;
  catalogs: ProjectCatalogs;
  changes: TaskChanges;
}

export interface TaskRowActions {
  onToggle: () => void;
  onOpen: () => void;
}
