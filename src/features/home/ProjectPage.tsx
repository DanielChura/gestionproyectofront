import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { useProject } from "./hooks/useProject";
import ProjectHeader from "./components/ProjectHeader";
import ListView from "./views/List/ListView";
import BoardView from "./views/Board/BoardView";
import OverviewView from "./views/Overview/OverviewView";
import GanttView from "./views/TaskGantt/GanttView";

export default function ProjectPage() {
  const { projectId } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { project, setProject, toggleFavorite } = useProject(Number(projectId));

  const params = new URLSearchParams(search);
  const viewKey = params.get("vista") ?? "lista";
  const taskParam = Number(params.get("tarea"));
  const initialTaskId =
    Number.isSafeInteger(taskParam) && taskParam > 0 ? taskParam : undefined;

  useEffect(() => {
    if (initialTaskId === undefined) return;
    const next = new URLSearchParams(search);
    next.delete("tarea");
    navigate({ pathname, search: next.toString() }, { replace: true });
  }, [initialTaskId, navigate, pathname, search]);

  if (!project) return null;

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col text-neutral-800 dark:text-neutral-100">
      <ProjectHeader
        project={project}
        viewKey={viewKey}
        onToggleFavorite={toggleFavorite}
      />

      {viewKey === "tablero" && (
        <BoardView project={project} onProjectChange={setProject} />
      )}
      {viewKey === "overview" && <OverviewView projectId={project.id} />}
      {viewKey === "gantt" && (
        <GanttView project={project} onProjectChange={setProject} />
      )}
      {viewKey !== "tablero" &&
        viewKey !== "overview" &&
        viewKey !== "gantt" && (
          <ListView
            project={project}
            onProjectChange={setProject}
            initialTaskId={initialTaskId}
          />
        )}
    </main>
  );
}
