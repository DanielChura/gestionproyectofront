import { Link } from "react-router";
import ProjectsIcon from "../../../../shared/icons/ProjectsIcon";
import { projectPath } from "../../../../routes";
import type { ProjectSummary } from "../../../../core/interfaces/project.interface";

interface ProjectLinkProps {
  project: ProjectSummary;
  currentPath: string;
}

export default function ProjectLink({
  project,
  currentPath,
}: ProjectLinkProps) {
  const path = projectPath(project.id);
  const active = currentPath === path || currentPath.startsWith(`${path}/`);

  return (
    <Link
      to={path}
      aria-current={active ? "page" : undefined}
      title={project.name}
      className={`badge min-w-0 ${
        active ? "text-neutral-700 dark:text-neutral-100" : ""
      }`}
    >
      <ProjectsIcon className="size-4 shrink-0" fill={active} />
      <span className="min-w-0 flex-1 truncate">{project.name}</span>
    </Link>
  );
}
