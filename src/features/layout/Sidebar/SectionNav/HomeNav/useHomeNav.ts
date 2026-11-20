import { useHomeActions } from "../../../../home/hooks/useHomeActions";
import { useProjects } from "../../../../home/hooks/useProjects";
import { projectPath } from "../../../../../routes";

export function useHomeNav(pathname: string) {
  const { projects } = useProjects();

  const activeProject =
    projects.find((project) => pathname.startsWith(projectPath(project.id))) ??
    projects[0] ??
    null;

  const actions = useHomeActions(activeProject);

  return { activeProject, actions };
}
