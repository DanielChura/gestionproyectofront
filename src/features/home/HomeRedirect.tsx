import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import EmptyState from "../../shared/states/EmptyState/EmptyState";
import { useProjects } from "./hooks/useProjects";

export default function HomeRedirect() {
  const { projects, isLoading } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    if (projects.length > 0) {
      navigate(`/proyectos/${projects[0].id}`, { replace: true });
    }
  }, [projects, navigate]);

  return (
    <main
      id="main-content"
      className="flex min-h-full items-center justify-center p-6 text-sm text-neutral-500 dark:text-neutral-400"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <SkeletonTheme
          baseColor="var(--skeleton-base)"
          highlightColor="var(--skeleton-highlight)"
          enableAnimation={false}
        >
          <Skeleton width={160} height={20} />
        </SkeletonTheme>
      ) : (
        projects.length === 0 && (
          <div className="flex max-w-md flex-col items-center text-center">
            <EmptyState
              iconName="projects"
              message="Sin proyectos asignados. Aún no formas parte de ningún proyecto. Puedes revisar las ofertas disponibles en Publicaciones o solicitar al administrador que te añada."
            />
            <Link
              to="/publicaciones"
              className="mt-3 inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-100 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Ver publicaciones
            </Link>
          </div>
        )
      )}
    </main>
  );
}
