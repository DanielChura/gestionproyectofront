import type { ProjectCatalogs } from "../../core/interfaces/project.interface";
import type {
  Project,
  ProjectTaskConfiguration,
  Task,
  TaskAction,
  TaskFormPayload,
  TaskStatePayload,
} from "../../core/interfaces/task.interface";

export type {
  ProjectSummary,
  ProjectArea,
  ProjectAreaGroup,
  ProjectCatalogs,
  ProjectTaskState,
  StateCategory,
  TaskStatusTemplate,
} from "../../core/interfaces/project.interface";

export type {
  Project,
  Task,
  TaskAction,
  TaskActionKind,
  TaskGroupingMode,
  TaskGroupingPreferences,
  TaskIdentity,
  TaskFormPayload,
  TaskStatePayload,
  CreateTaskPayload,
  EditTaskPayload,
  Label,
  LabelKind,
  ProjectRequirement,
  TaskLabel,
  TaskAssignee,
  TaskListGroup,
  TaskGroupToken,
  TaskCreationRequest,
  ProjectTaskConfiguration,
  ProjectTaskConfigurationPayload,
  Specialty,
  TeamOption,
  WorkerCandidate,
  ProjectDraft,
  CreateProjectPayload,
  TaskDetailData,
  SubtaskPage,
  TaskActivityGroup,
  TaskRelation,
  RelationKind,
} from "../../core/interfaces/task.interface";

export interface TaskGroupControls {
  expanded: boolean;
  disabled: boolean;
  controls: string;
  toggle: () => void;
}

export interface TaskDialogController {
  project: Project;
  tasks: Task[];
  catalogs: ProjectCatalogs;
  action: TaskAction | null;
  busy: boolean;
  close: () => void;
  saveTask: (data: TaskFormPayload) => Promise<void>;
  changeState: (task: Task, data: TaskStatePayload) => Promise<void>;
  changeDependency: (predecessorId: number, remove: boolean) => Promise<void>;
  configuredStates: (configuration: ProjectTaskConfiguration) => void;
}
