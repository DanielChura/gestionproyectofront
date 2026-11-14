import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAreas } from "../../../../core/services/organizationService";
import { useAuth } from "../../../../hooks/useAuth";
import { useProjects } from "../../../home/hooks/useProjects";
import type { Area } from "../../../../core/interfaces/organization.interface";
import type { ProjectAreaGroup } from "../../../../core/interfaces/project.interface";

const NO_AREA_NAME = "Sin área";

export function useProjectsByArea() {
  const { user, isAdmin } = useAuth();
  const { projects } = useProjects();
  const showAllAreas = isAdmin || Boolean(user?.all_areas);

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: listAreas,
    enabled: showAllAreas,
    select: (data) =>
      Array.isArray(data) ? data.filter((area) => area.active) : [],
  });

  const groups = useMemo<ProjectAreaGroup[]>(() => {
    const map = new Map<number, ProjectAreaGroup>();

    if (showAllAreas) {
      for (const area of areas) {
        map.set(area.id, { id: area.id, name: area.name, projects: [] });
      }
    }

    for (const project of projects) {
      const projectAreas = project.areas?.length
        ? project.areas
        : [{ id: 0, name: NO_AREA_NAME }];

      for (const area of projectAreas) {
        const group = map.get(area.id) ?? { ...area, projects: [] };
        group.projects.push(project);
        map.set(area.id, group);
      }
    }

    return [...map.values()].sort((a, b) => {
      if (a.id === 0) return 1;
      if (b.id === 0) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [areas, projects, showAllAreas]);

  return { groups };
}
