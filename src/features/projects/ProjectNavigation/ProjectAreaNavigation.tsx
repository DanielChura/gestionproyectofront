import { useEffect, useMemo, useState } from "react";
import ChevronDownIcon from "../../../shared/icons/ChevronIcon";
import { projectPath } from "../../../routes";
import type { ProjectNavigationProps } from "../types";
import ProjectNavigation from "./ProjectNavigation";
import { groupProjectsByArea } from "./groupProjectsByArea";

export default function ProjectAreaNavigation({
  projects,
  currentPath,
  loading,
  error,
  onRetry,
  canCreateTasks,
  onCreateTask,
}: ProjectNavigationProps) {
  const groups = useMemo(() => groupProjectsByArea(projects), [projects]);
  const [expandedAreas, setExpandedAreas] = useState<Record<number, boolean>>(
    {},
  );
  const activeAreaId = groups.find((area) =>
    area.projects.some((project) => {
      const path = projectPath(project.id);
      return currentPath === path || currentPath.startsWith(`${path}/`);
    }),
  )?.id;

  useEffect(() => {
    if (activeAreaId === undefined) return;
    let current = true;
    void Promise.resolve().then(() => {
      if (current)
        setExpandedAreas((expanded) => ({ ...expanded, [activeAreaId]: true }));
    });
    return () => {
      current = false;
    };
  }, [activeAreaId, currentPath]);

  return (
    <div aria-busy={loading}>
      {loading && (
        <p
          className="mx-3 text-xs text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          Cargando proyectos…
        </p>
      )}
      {error && (
        <p
          className="mx-3 break-words text-xs text-neutral-600 dark:text-neutral-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {error && onRetry && (
        <button
          type="button"
          disabled={loading}
          onClick={onRetry}
          className="mx-3 mb-2 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-neutral-700"
        >
          Volver a cargar proyectos
        </button>
      )}
      {!loading && !error && groups.length === 0 && (
        <p
          className="mx-3 text-xs text-neutral-600 dark:text-neutral-400"
          role="status"
        >
          No hay proyectos autorizados con trabajadores asociados.
        </p>
      )}
      <ul
        className="m-0 flex list-none flex-col gap-2 p-0 hidden:hidden"
        aria-label="Áreas con proyectos asociados"
        hidden={loading || Boolean(error)}
      >
        {groups.map((area) => {
          const expanded = expandedAreas[area.id] ?? area.id === activeAreaId;
          const childrenId = `project-area-${area.id}-navigation`;
          return (
            <li key={area.id} className="min-w-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={childrenId}
                aria-label={`${expanded ? "Contraer" : "Expandir"} área ${area.name}`}
                title={area.name}
                className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs  text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-700"
                onClick={() =>
                  setExpandedAreas((current) => ({
                    ...current,
                    [area.id]: !expanded,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    setExpandedAreas((current) => ({
                      ...current,
                      [area.id]: event.key === "ArrowRight",
                    }));
                  }
                }}
              >
                <span
                  aria-hidden="true"
                  className="grid size-5 shrink-0 place-items-center rounded-md bg-neutral-200 dark:bg-neutral-700 text-xs font- text-neutral-800 dark:text-neutral-100"
                >
                  {Array.from(area.name.trim())[0]?.toLocaleUpperCase("es")}
                </span>
                <span className="min-w-0 flex-1 truncate">{area.name}</span>
                <span aria-hidden="true" className="shrink-0">
                  <ChevronDownIcon
                    className={`size-4 ${expanded ? "" : "-rotate-90"}`}
                  />
                </span>
              </button>
              <div id={childrenId} hidden={!expanded} className="ml-4 mt-1">
                <ProjectNavigation
                  projects={area.projects}
                  currentPath={currentPath}
                  loading={false}
                  error=""
                  canCreateTasks={canCreateTasks}
                  onCreateTask={onCreateTask}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
