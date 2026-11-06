import { httpClient } from "../api/httpClient";
import type {
  CreateTaskPayload,
  EditTaskPayload,
  RelationKind,
  SubtaskPage,
  Task,
  TaskActivityGroup,
  TaskDetailData,
  TaskIdentity,
  TaskPage,
  TaskRelation,
  TaskStatePayload,
} from "../interfaces/task.interface";

export async function getTasks(projectId: number): Promise<Task[]> {
  const { data } = await httpClient.get<Task[]>(`projects/${projectId}/tasks/`);
  return data;
}

export async function moveTask(
  projectId: number,
  taskId: number,
  payload: TaskStatePayload & {
    before_id: number | null;
    expected_revision: string;
  },
): Promise<Task[]> {
  const { data } = await httpClient.post<Task[]>(
    `projects/${projectId}/tasks/${taskId}/move/`,
    payload,
  );
  return data;
}

export async function createTask(
  projectId: number,
  payload: CreateTaskPayload,
): Promise<Task> {
  const { data } = await httpClient.post<Task>(
    `projects/${projectId}/tasks/`,
    payload,
  );
  return data;
}

export async function updateTask(
  projectId: number,
  taskId: number,
  payload: Partial<EditTaskPayload>,
): Promise<Task> {
  const { data } = await httpClient.patch<Task>(
    `projects/${projectId}/tasks/${taskId}/`,
    payload,
  );
  return data;
}

export async function changeTaskState(
  projectId: number,
  taskId: number,
  payload: TaskStatePayload,
): Promise<Task> {
  const { data } = await httpClient.post<Task>(
    `projects/${projectId}/tasks/${taskId}/state/`,
    payload,
  );
  return data;
}

export async function changeDependency(
  projectId: number,
  taskId: number,
  predecessorId: number,
  remove: boolean,
): Promise<void> {
  if (remove) {
    await httpClient.delete(
      `projects/${projectId}/tasks/${taskId}/dependencies/`,
      {
        data: { predecessor_id: predecessorId },
      },
    );
  } else {
    await httpClient.post(
      `projects/${projectId}/tasks/${taskId}/dependencies/`,
      {
        predecessor_id: predecessorId,
      },
    );
  }
}

export async function getTaskDetail(
  target: TaskIdentity,
): Promise<TaskDetailData> {
  const { data } = await httpClient.get<TaskDetailData>(
    `projects/${target.projectId}/tasks/${target.taskId}/`,
  );
  return data;
}

export async function getTaskSubtasks(
  target: TaskIdentity,
  cursor = 0,
): Promise<SubtaskPage> {
  const { data } = await httpClient.get<SubtaskPage>(
    `projects/${target.projectId}/tasks/${target.taskId}/subtasks/?cursor=${cursor}`,
  );
  return data;
}

export async function getTaskActivity(
  target: TaskIdentity,
  cursor = 0,
): Promise<TaskPage<TaskActivityGroup>> {
  const { data } = await httpClient.get<TaskPage<TaskActivityGroup>>(
    `projects/${target.projectId}/tasks/${target.taskId}/activity/?cursor=${cursor}`,
  );
  return data;
}

export async function getTaskRelations(
  target: TaskIdentity,
  cursor = 0,
): Promise<TaskPage<TaskRelation>> {
  const { data } = await httpClient.get<TaskPage<TaskRelation>>(
    `projects/${target.projectId}/tasks/${target.taskId}/relations/?cursor=${cursor}`,
  );
  return data;
}

export async function searchRelatedTasks(
  target: TaskIdentity,
  kind: RelationKind,
  query: string,
  cursor = 0,
): Promise<TaskPage<Task>> {
  const params = new URLSearchParams({
    kind,
    q: query,
    cursor: String(cursor),
  });
  const { data } = await httpClient.get<TaskPage<Task>>(
    `projects/${target.projectId}/tasks/${target.taskId}/related-candidates/?${params}`,
  );
  return data;
}

export async function createTaskRelation(
  target: TaskIdentity,
  targetId: number,
  name: string,
): Promise<void> {
  await httpClient.post(
    `projects/${target.projectId}/tasks/${target.taskId}/relations/`,
    { target_id: targetId, name },
  );
}

export async function removeTaskRelation(
  target: TaskIdentity,
  relationId: number,
): Promise<void> {
  await httpClient.delete(
    `projects/${target.projectId}/tasks/${target.taskId}/relations/${relationId}/`,
  );
}
