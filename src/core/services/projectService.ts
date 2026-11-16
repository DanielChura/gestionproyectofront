import { httpClient } from "../api/httpClient";
import type {
  ProjectArea,
  ProjectCatalogs,
  ProjectSummary,
  TaskStatusTemplate,
} from "../interfaces/project.interface";
import type {
  CreateProjectPayload,
  Project,
  ProjectFavoriteState,
  ProjectTaskConfiguration,
  ProjectTaskConfigurationPayload,
  TeamOption,
  WorkerCandidate,
} from "../interfaces/task.interface";
import type { ProjectChartsResponse } from "../interfaces/projectOverview.interface";

export async function getProjects(): Promise<ProjectSummary[]> {
  const projects: ProjectSummary[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 100; page += 1) {
    const query = new URLSearchParams({ page_size: "50" });
    if (cursor) query.set("cursor", cursor);
    const { data } = await httpClient.get<{
      results: ProjectSummary[];
      next_cursor: string | null;
    }>(`projects/?${query.toString()}`);
    if (Array.isArray(data?.results)) projects.push(...data.results);
    cursor = data?.next_cursor ?? null;
    if (!cursor) break;
  }
  return projects;
}

export async function getProjectCatalogs(): Promise<ProjectCatalogs> {
  const { data } = await httpClient.get<ProjectCatalogs>("projects/catalogs/");
  return data;
}

export async function getProjectAreas(
  filters: { associated?: boolean } = {},
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<{ results: ProjectArea[]; next_cursor: string | null }> {
  const query = new URLSearchParams();
  if (filters.associated !== undefined)
    query.set("associated", String(filters.associated));
  if (cursor) query.set("cursor", cursor);
  const { data } = await httpClient.get<{
    results: ProjectArea[];
    next_cursor: string | null;
  }>(
    `projects/areas/${query.size ? "?" + query : ""}`,
    signal ? { signal } : undefined,
  );
  return data;
}

export async function getProjectCharts(
  projectId: number,
): Promise<ProjectChartsResponse> {
  const { data } = await httpClient.get<ProjectChartsResponse>(
    `projects/${projectId}/charts/`,
  );
  return data;
}

export async function getProject(projectId: number): Promise<Project> {
  const { data } = await httpClient.get<Project>(`projects/${projectId}/`);
  return data;
}

export async function setProjectFavorite(
  projectId: number,
  favorite: boolean,
): Promise<ProjectFavoriteState> {
  const { data } = favorite
    ? await httpClient.put<ProjectFavoriteState>(
        `projects/${projectId}/favorite/`,
      )
    : await httpClient.delete<ProjectFavoriteState>(
        `projects/${projectId}/favorite/`,
      );
  return data;
}

export async function getProjectTaskStates(
  projectId: number,
): Promise<ProjectTaskConfiguration> {
  const { data } = await httpClient.get<ProjectTaskConfiguration>(
    `projects/${projectId}/task-states/`,
  );
  return data;
}

export async function configureProjectTaskStates(
  projectId: number,
  payload: ProjectTaskConfigurationPayload,
): Promise<ProjectTaskConfiguration> {
  const { data } = await httpClient.patch<ProjectTaskConfiguration>(
    `projects/${projectId}/task-states/`,
    payload,
  );
  return data;
}

export async function getTaskStatusTemplates(
  projectId: number,
): Promise<TaskStatusTemplate[]> {
  const { data } = await httpClient.get<TaskStatusTemplate[]>(
    `projects/${projectId}/state-templates/`,
  );
  return data;
}

export async function saveTaskStatusTemplate(
  projectId: number,
  payload: Pick<TaskStatusTemplate, "name" | "states"> & { revision?: number },
  templateId?: number,
): Promise<TaskStatusTemplate> {
  const url = `projects/${projectId}/state-templates/${templateId === undefined ? "" : `${templateId}/`}`;
  const { data } =
    templateId === undefined
      ? await httpClient.post<TaskStatusTemplate>(url, payload)
      : await httpClient.put<TaskStatusTemplate>(url, payload);
  return data;
}

export async function getWorkerCandidates(
  areaIds: number[],
  search: string,
): Promise<WorkerCandidate[]> {
  const query = new URLSearchParams({ area_ids: areaIds.join(","), q: search });
  const { data } = await httpClient.get<WorkerCandidate[]>(
    `projects/workers/?${query}`,
  );
  return data;
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  const { data } = await httpClient.post<Project>("projects/", payload);
  return data;
}

export async function addProjectParticipants(
  projectId: number,
  payload: {
    participant_source: "workers" | "teams";
    worker_ids?: number[];
    team_ids?: number[];
  },
): Promise<Project> {
  const { data } = await httpClient.post<Project>(
    `projects/${projectId}/members/`,
    payload,
  );
  return data;
}

export async function updateProject(
  projectId: number,
  payload: Partial<CreateProjectPayload>,
): Promise<Project> {
  const { data } = await httpClient.patch<Project>(
    `projects/${projectId}/`,
    payload,
  );
  return data;
}

export async function getProjectTeamCandidates(
  areaId: number,
): Promise<TeamOption[]> {
  const { data } = await httpClient.get<TeamOption[]>(
    `projects/teams/?area_id=${areaId}`,
  );
  return data;
}

export async function getProjectAssignmentTeams(
  projectId: number,
): Promise<TeamOption[]> {
  const { data } = await httpClient.get<TeamOption[]>(
    `projects/${projectId}/assignment-teams/`,
  );
  return data;
}

export async function getProjectPage(
  filters: {
    area_id?: number;
    project_id?: number;
    associated?: boolean;
    q?: string;
  } = {},
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<{ results: ProjectSummary[]; next_cursor: string | null }> {
  const query = new URLSearchParams({ page_size: "50" });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  if (cursor) query.set("cursor", cursor);
  const { data } = await httpClient.get<{
    results: ProjectSummary[];
    next_cursor: string | null;
  }>(`projects/?${query}`, { signal });
  return data;
}
