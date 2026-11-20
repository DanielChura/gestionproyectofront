import type { AxiosRequestConfig } from "axios";
import { httpClient } from "../../core/api/httpClient";

import type {
  TaskIdentity,
  TaskDetailData,
  SubtaskPage,
  TaskPage,
  TaskActivityGroup,
  TaskRelation,
  RelationKind,
} from "./types";
import type {
  CreateProjectPayload,
  CreateTaskPayload,
  TaskPatchPayload,
  Project,
  ProjectFavoriteState,
  ProjectTaskConfiguration,
  ProjectTaskConfigurationPayload,
  Task,
  TaskStatePayload,
  WorkerCandidate,
  TaskStatusTemplate,
  TeamOption,
  ProjectMemberRole,
} from "./types";

async function projectRequest<T>(
  path = "",
  options?: AxiosRequestConfig,
): Promise<T> {
  const url = `projects/${path}`;
  const response = options
    ? await httpClient.request<T>({ url, ...options })
    : await httpClient.get<T>(url);
  return response.data;
}

function taskPath(target: TaskIdentity) {
  return `${target.projectId}/tasks/${target.taskId}/`;
}

export function getTaskDetail(target: TaskIdentity): Promise<TaskDetailData> {
  return projectRequest<TaskDetailData>(taskPath(target));
}

export function getTaskSubtasks(
  target: TaskIdentity,
  cursor = 0,
): Promise<SubtaskPage> {
  return projectRequest<SubtaskPage>(
    `${taskPath(target)}subtasks/?cursor=${cursor}`,
  );
}

export function getTaskActivity(
  target: TaskIdentity,
  cursor = 0,
): Promise<TaskPage<TaskActivityGroup>> {
  return projectRequest<TaskPage<TaskActivityGroup>>(
    `${taskPath(target)}activity/?cursor=${cursor}`,
  );
}

export function getTaskRelations(
  target: TaskIdentity,
  cursor = 0,
): Promise<TaskPage<TaskRelation>> {
  return projectRequest<TaskPage<TaskRelation>>(
    `${taskPath(target)}relations/?cursor=${cursor}`,
  );
}

export function searchRelatedTasks(
  target: TaskIdentity,
  kind: RelationKind,
  query: string,
  cursor = 0,
): Promise<TaskPage<Task>> {
  return projectRequest<TaskPage<Task>>(
    `${taskPath(target)}related-candidates/?${new URLSearchParams({
      kind,
      q: query,
      cursor: String(cursor),
    })}`,
  );
}

export function createTaskRelation(
  target: TaskIdentity,
  targetId: number,
  name: string,
): Promise<void> {
  return projectRequest<void>(`${taskPath(target)}relations/`, {
    method: "POST",
    data: { target_id: targetId, name },
  });
}

export function removeTaskRelation(
  target: TaskIdentity,
  relationId: number,
): Promise<void> {
  return projectRequest<void>(`${taskPath(target)}relations/${relationId}/`, {
    method: "DELETE",
  });
}

export function getProject(projectId: number): Promise<Project> {
  return projectRequest(`${projectId}/`);
}

export function setProjectMemberRole(
  projectId: number,
  workerId: number,
  role: ProjectMemberRole,
): Promise<Project["participants"]> {
  return projectRequest(`${projectId}/members/${workerId}/role/`, {
    method: "PUT",
    data: { role },
  });
}

export function setProjectFavorite(
  projectId: number,
  favorite: boolean,
): Promise<ProjectFavoriteState> {
  return projectRequest(`${projectId}/favorite/`, {
    method: favorite ? "PUT" : "DELETE",
  });
}

export function getTasks(projectId: number): Promise<Task[]> {
  return projectRequest(`${projectId}/tasks/`);
}

export function getProjectTaskStates(
  projectId: number,
): Promise<ProjectTaskConfiguration> {
  return projectRequest(`${projectId}/task-states/`);
}

export function configureProjectTaskStates(
  projectId: number,
  payload: ProjectTaskConfigurationPayload,
): Promise<ProjectTaskConfiguration> {
  return projectRequest(`${projectId}/task-states/`, {
    method: "PATCH",
    data: payload,
  });
}

export function getTaskStatusTemplates(
  projectId: number,
): Promise<TaskStatusTemplate[]> {
  return projectRequest(`${projectId}/state-templates/`);
}

export function saveTaskStatusTemplate(
  projectId: number,
  payload: Pick<TaskStatusTemplate, "name" | "states"> & { revision?: number },
  templateId?: number,
): Promise<TaskStatusTemplate> {
  return projectRequest(
    `${projectId}/state-templates/${
      templateId === undefined ? "" : `${templateId}/`
    }`,
    {
      method: templateId === undefined ? "POST" : "PUT",
      data: payload,
    },
  );
}

export function getWorkerCandidates(
  areaIds: number[],
  search: string,
): Promise<WorkerCandidate[]> {
  const query = new URLSearchParams({
    area_ids: areaIds.join(","),
    q: search,
  });
  return projectRequest(`workers/?${query}`);
}

export function createProject(payload: CreateProjectPayload): Promise<Project> {
  return projectRequest("", { method: "POST", data: payload });
}

export function getProjectTeamCandidates(
  areaId: number,
): Promise<TeamOption[]> {
  return projectRequest<TeamOption[]>(`teams/?area_id=${areaId}`);
}

export function getProjectAssignmentTeams(
  projectId: number,
): Promise<TeamOption[]> {
  return projectRequest<TeamOption[]>(`${projectId}/assignment-teams/`);
}

export function createTask(
  projectId: number,
  payload: CreateTaskPayload,
): Promise<Task> {
  return projectRequest(`${projectId}/tasks/`, {
    method: "POST",
    data: payload,
  });
}

export function updateTask(
  projectId: number,
  taskId: number,
  payload: TaskPatchPayload,
): Promise<Task> {
  const dates =
    "start_date" in payload || "due_date" in payload || "schedule" in payload;
  if (
    dates &&
    (!payload.expected_calendar_revision || !payload.calendar_intent_id)
  )
    throw new Error(
      "La edición de fechas requiere revisión e intención de calendario.",
    );
  if (
    !dates &&
    ("expected_calendar_revision" in payload || "calendar_intent_id" in payload)
  )
    throw new Error(
      "Las precondiciones de calendario requieren una edición de fechas.",
    );
  return projectRequest<Task>(`${projectId}/tasks/${taskId}/`, {
    method: "PATCH",
    data: payload,
  });
}

export function changeTaskState(
  projectId: number,
  taskId: number,
  payload: TaskStatePayload,
): Promise<Task> {
  return projectRequest(`${projectId}/tasks/${taskId}/state/`, {
    method: "POST",
    data: payload,
  });
}

export async function changeDependency(
  projectId: number,
  taskId: number,
  predecessorId: number,
  remove: boolean,
  type?: import("./types").DependencyType,
  undoToken?: string,
): Promise<import("./types").DependencyUndoReceipt | undefined> {
  const response = await httpClient.request<void>({
    url: `projects/${projectId}/tasks/${taskId}/dependencies/`,
    method: remove ? "DELETE" : "POST",
    data: {
      predecessor_id: predecessorId,
      ...(type ? { dependency_type: type } : {}),
      ...(undoToken ? { undo_token: undoToken } : {}),
    },
  });
  const token = response.headers["x-gm-dependency-undo"] as string | undefined;
  const expires = Number(response.headers["x-gm-dependency-undo-expires"]);
  return token && Number.isFinite(expires) ? { token, expires } : undefined;
}

export async function convertDependency(
  projectId: number,
  taskId: number,
  predecessorId: number,
  type: import("./types").DependencyType,
  expected: import("./types").DependencyType | null,
): Promise<void> {
  await projectRequest<void>(`${projectId}/tasks/${taskId}/dependencies/`, {
    method: "PATCH",
    data: {
      predecessor_id: predecessorId,
      dependency_type: type,
      expected_type: expected,
    },
  });
}
