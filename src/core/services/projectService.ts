import { httpClient } from "../api/httpClient";
import type {
  ProjectCatalogs,
  ProjectSummary,
} from "../interfaces/project.interface";
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

export async function getProjectCharts(
  projectId: number,
): Promise<ProjectChartsResponse> {
  const { data } = await httpClient.get<ProjectChartsResponse>(
    `projects/${projectId}/charts/`,
  );
  return data;
}