import { useState } from "react";
import Avatar from "../../../../shared/Avatar";
import ChevronDownIcon from "../../../../shared/icons/ChevronIcon";
import ProjectLink from "./ProjectLink";
import { useProjectsByArea } from "./useProjectsByArea";

interface ProjectsByAreaProps {
  currentPath: string;
}

export default function ProjectsByArea({ currentPath }: ProjectsByAreaProps) {
  const { groups, projects, grouped } = useProjectsByArea();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (!grouped) {
    if (projects.length === 0) return null;

    return (
      <ul
        className="m-0 flex list-none flex-col gap-1 p-0"
        aria-label="Mis proyectos"
      >
        {projects.map((project) => (
          <li key={project.id} className="min-w-0">
            <ProjectLink project={project} currentPath={currentPath} />
          </li>
        ))}
      </ul>
    );
  }

  if (groups.length === 0) return null;

  return (
    <ul
      className="m-0 flex list-none flex-col gap-1 p-0"
      aria-label="Áreas con proyectos"
    >
      {groups.map((area) => {
        const expanded = !collapsed[area.id];

        return (
          <li key={area.id} className="min-w-0">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setCollapsed((current) => ({
                  ...current,
                  [area.id]: expanded,
                }))
              }
              className="badge w-full min-w-0 text-left"
            >
              <Avatar
                name={area.name.trim().charAt(0)}
                aria-hidden="true"
                className="size-5 rounded-md text-[10px] font-medium"
              />
              <span className="min-w-0 flex-1 truncate">{area.name}</span>
              <ChevronDownIcon
                className={`size-4 shrink-0 ${expanded ? "" : "-rotate-90"}`}
              />
            </button>

            {expanded && (
              <ul className="m-0 ml-4 mt-1 flex list-none flex-col gap-1 p-0">
                {area.projects.length === 0 && (
                  <li className="px-3 py-1 text-xs text-neutral-400 dark:text-neutral-500">
                    Sin proyectos
                  </li>
                )}

                {area.projects.map((project) => (
                  <li key={project.id} className="min-w-0">
                    <ProjectLink project={project} currentPath={currentPath} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
