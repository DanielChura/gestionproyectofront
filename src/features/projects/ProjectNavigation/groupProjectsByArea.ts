import type { ProjectAreaGroup, ProjectSummary } from "../types";

export function groupProjectsByArea(projects: ProjectSummary[]): ProjectAreaGroup[] {
  if (!Array.isArray(projects)) return [];
  const groups = new Map<number, ProjectAreaGroup>();
  for (const project of projects) {
    if (project.has_associated_workers !== true || project.areas.length !== 1) continue;
    const area = project.areas[0];
    let group = groups.get(area.id);
    if (!group) {
      group = { ...area, projects: [] };
      groups.set(area.id, group);
    }
    group.projects.push(project);
  }
  return [...groups.values()];
}