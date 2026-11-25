import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import EmptyState from "../../shared/states/EmptyState/EmptyState";
import { useProject } from "./hooks/useProject";
import ProjectHeader from "./components/ProjectHeader";
import ShareProjectModal from "./components/ShareProjectModal";
import ProjectTaskWorkspace from "./components/ProjectTaskWorkspace";
import ListView from "./views/List/ListView";
import BoardView from "./views/Board/BoardView";
import OverviewView from "./views/Overview/OverviewView";
import GanttView from "./views/TaskGantt/GanttView";

export default function HomePage() {
  const { projectId } = useParams();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const {
    project,
    setProject,
    toggleFavorite,
    updateMemberRole,
    addParticipants,
    favoritePending,
  } = useProject(Number(projectId));

  const params = new URLSearchParams(search);
  const viewKey = params.get("vista") ?? "lista";
  const taskParam = Number(params.get("tarea"));
  const initialTaskId =
    Number.isSafeInteger(taskParam) && taskParam > 0 ? taskParam : undefined;
  const initialCreate = params.get("crear") === "tarea" ? 1 : undefined;
  const handleCreate = useCallback(() => {
    const next = new URLSearchParams(search);
    next.delete("crear");
    navigate({ pathname, search: next.toString() }, { replace: true });
  }, [navigate, pathname, search]);

  useEffect(() => {
    if (initialTaskId === undefined || project?.id !== Number(projectId))
      return;
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const next = new URLSearchParams(search);
      next.delete("tarea");
      navigate({ pathname, search: next.toString() }, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [initialTaskId, navigate, pathname, search, project?.id, projectId]);

  if (!project) {
    return (
      <main
        id="main-content"
        className="flex min-h-full flex-1 items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-400"
      >
        <div className="flex max-w-md flex-col items-center text-center">
          <EmptyState
            iconName="projects"
            message="No tienes acceso a este proyecto o aún no formas parte de él. Puedes revisar las ofertas en Publicaciones o solicitar acceso a un administrador."
          />
          <Link
            to="/publicaciones"
            className="mt-3 inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Ver publicaciones
          </Link>
        </div>
      </main>
    );
  }

  return (
    <ProjectTaskWorkspace key={project.id} projectId={project.id}>
      <main className="flex h-full min-h-0 flex-1 flex-col text-neutral-700 dark:text-neutral-100">
        <ProjectHeader
          project={project}
          viewKey={viewKey}
          onToggleFavorite={toggleFavorite}
          onShare={() => setSharing(true)}
          pending={favoritePending}
        />

        {viewKey === "tablero" && (
          <BoardView project={project} onProjectChange={setProject} />
        )}
        {viewKey === "overview" && (
          <OverviewView
            project={project}
            onMemberRoleChange={updateMemberRole}
          />
        )}
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
              initialCreate={initialCreate}
              onCreateHandled={handleCreate}
            />
          )}

        {sharing && (
          <ShareProjectModal
            project={project}
            onClose={() => setSharing(false)}
            onAddParticipants={addParticipants}
          />
        )}
      </main>
    </ProjectTaskWorkspace>
  );
}
