import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getProjects } from "../../../core/services/projectService";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";
import { projectPath } from "../../../routes";
import EmptyState from "../../../shared/EmptyState/EmptyState";
import ProjectsIcon from "../../../shared/icons/ProjectsIcon";

function ProjectsSection() {
  const [data, setData] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    getProjects()
      .then((projects) => {
        if (mounted) setData(projects);
      })
      .catch((e: unknown) => {
        console.error("Error fetching projects:", e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section aria-label="Proyectos" className="flex h-full flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-sm text-neutral-800 dark:text-neutral-100">
          Proyectos
        </h3>
      </div>

      {data.length === 0 ? (
        <EmptyState
          iconName="projects"
          message="No hay proyectos registrados."
        />
      ) : (
        <ul className="m-0 p-0 list-none space-y-0.5">
          {data.map((project) => (
            <li
              key={project.id}
              className="px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-xs"
            >
              <span
                className="inline-flex items-center text-orange-500"
                aria-hidden="true"
              >
                <ProjectsIcon className="size-4" />
              </span>
              <Link
                to={projectPath(project.id)}
                className="flex-1 min-w-0 text-neutral-800 dark:text-neutral-100 truncate cursor-pointer"
              >
                {project.name}
              </Link>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
                {project.start_date}
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                {project.areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded "
                  >
                    {area.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ProjectsSection;
