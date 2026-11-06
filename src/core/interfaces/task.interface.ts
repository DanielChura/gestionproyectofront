import type { ProjectSummary, ProjectTaskState, StateCategory, Tema } from "./project.interface";

export type LabelKind = "technical" | "nontechnical" | "specialty";

export interface Specialty {
  id: number;
  name: string;
}

export interface TeamOption {
  id: number;
  name: string;
  eligible_count: number;
  members: { id: number; name: string; eligible: boolean; reason: string }[];
}

export interface Label {
  id?: number;
  specialty_id?: number | null;
  requirement_id?: number | null;
  name: string;
  kind: LabelKind;
}

export interface ProjectRequirement extends Label {
  id: number;
}

export interface TaskLabel extends Label {
  id: number;
  requirement_id: number | null;
}

export interface ProjectFavoriteState {
  is_favorite: boolean;
}

export interface ProjectTaskConfiguration {
  tasks?: Task[];
  template: "standard" | "custom";
  states: ProjectTaskState[];
  available_states: ProjectTaskState[];
  revision: string;
  can_configure: boolean;
  usage?: Record<string, number>;
}

export interface ProjectTaskConfigurationPayload {
  template: "standard" | "custom";
  revision: string;
  states: ProjectTaskState[];
}

export interface WorkerCandidate {
  id: number;
  name: string;
  project_count: number;
}

export type ProjectMode = "available" | "assigned";

export interface ProjectDraft {
  participantSource?: "workers" | "teams";
  teamIds?: number[];
  initialTaskStates?: ProjectTaskState[];
  name: string;
  description: string;
  endDate: string;
  areaIds: number[];
  mode: ProjectMode;
  workerIds: number[];
  workerContribute: boolean;
}

export interface CreateProjectPayload {
  participant_source?: "workers" | "teams";
  team_ids?: number[];
  initial_task_states?: Pick<ProjectTaskState, "name" | "category">[];
  name: string;
  description: string;
  end_date: string | null;
  area_ids: number[];
  mode: ProjectMode;
  worker_ids: number[];
  worker_contribute: boolean;
}

export interface Project extends ProjectSummary {
  assignment_teams?: TeamOption[];
  is_favorite: boolean;
  participants: { id: number; name: string }[];
  requirements: ProjectRequirement[];
  task_states: ProjectTaskConfiguration;
}

export interface Task {
  updated_at?: string;
  move_revision?: string;
  move_targets?: string[];
  manual_position?: string | null;
  id: number;
  parent_id: number | null;
  name: string;
  description: string;
  state_code: string;
  state_name: string;
  state_category?: StateCategory;
  state_tema_id: number;
  state_tema: Tema | null;
  priority: number | null;
  created_at: string;
  start_date: string;
  due_date: string | null;
  estimated_minutes?: number | null;
  responsible_id: number | null;
  responsible_name: string | null;
  assignees?: TaskAssignee[];
  labels: TaskLabel[];
  dependencies: number[];
  transitions: { target: string; reason_required: boolean }[];
  permissions: {
    edit: boolean;
    state: boolean;
    assign: boolean;
    create_child: boolean;
    dependencies: boolean;
    relations?: boolean;
  };
}

export interface EditTaskPayload {
  estimated_minutes?: number | null;
  start_date?: string;
  name: string;
  description?: string;
  priority?: number | null;
  due_date?: string | null;
  requirement_ids?: number[];
  labels?: Label[];
  specialty_ids?: number[];
  retained_label_ids?: number[];
  responsible_id?: number | null;
  responsible_ids?: number[];
}

export interface TaskIdentity {
  projectId: number;
  taskId: number;
}

export interface TaskDetailData {
  task: Task;
  parent: Task | null;
}

export interface TaskPage<T> {
  items: T[];
  next_cursor: number | null;
}

export interface SubtaskPage extends TaskPage<Task> {
  total: number;
  completed: number;
}

export type RelationKind = "blocks" | "blocked_by" | "custom";

export interface TaskRelation {
  id: string;
  kind: RelationKind;
  name: string;
  target_id: number;
  target_name: string;
  relation_id?: number;
  predecessor_id?: number;
  successor_id?: number;
}

export interface TaskActivityEvent {
  id: number;
  operation_id: string;
  actor_id: number;
  actor_name: string;
  action: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  related_task_id: number | null;
  created_at: string;
}

export interface TaskActivityGroup {
  id: string;
  events: TaskActivityEvent[];
}

export interface TaskAssignee {
  id: number;
  name: string;
}

export type TaskGroupingMode =
  | "state"
  | "assignees"
  | "priority"
  | "labels"
  | "due_date";

export type TaskGroupOrder = "asc" | "desc";

export interface TaskGroupingPreferences {
  mode: TaskGroupingMode;
  order: TaskGroupOrder;
  separatePeople: boolean;
  separateLabels: boolean;
}

export interface TaskGroupToken {
  id: string;
  name: string;
  kind?: LabelKind;
}

export interface TaskListGroup {
  key: string;
  name: string;
  stateCode?: string;
  stateCategory?: StateCategory;
  stateColor?: string;
  priority?: number;
  tokens: TaskGroupToken[];
  rank: number;
  members: Set<number>;
  visible: Set<number>;
  roots: Task[];
}

export interface CreateTaskPayload extends Partial<Omit<EditTaskPayload, "name">> {
  name: string;
  state_code: string;
  parent_id: number | null;
  reason: string;
}

export type TaskFormPayload = CreateTaskPayload | EditTaskPayload;

export interface TaskStatePayload {
  state_code: string;
  reason?: string;
}

export type TaskActionKind =
  | "edit"
  | "state"
  | "child"
  | "dependencies"
  | "detail";

export type TaskAction =
  | { kind: "create"; stateCode?: string }
  | { kind: TaskActionKind; taskId: number };

export interface TaskCreationRequest {
  projectId: number;
  sequence: number;
}

// Re-export for convenience
export type { StateCategory, ProjectTaskState, Tema } from "./project.interface";
