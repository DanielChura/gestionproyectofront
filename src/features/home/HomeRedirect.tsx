import { useEffect } from "react";
import { useNavigate } from "react-router";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
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
      className="flex min-h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
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
        projects.length === 0 && "No hay proyectos disponibles."
      )}
    </main>
  );
}
