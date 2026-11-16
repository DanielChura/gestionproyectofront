import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import type { Project } from "../../../core/interfaces/task.interface";
import {
  getProject,
  setProjectFavorite,
} from "../../../core/services/projectService";
import { errorText } from "../../auth/api";
import { useToast } from "../../../hooks/useToast";

export function useProject(projectId: number) {
  const queryClient = useQueryClient();
  const favoriteLock = useRef(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [favoriteError, setFavoriteError] = useState("");
  const { addToast } = useToast();

  const { data: project = null, refetch } = useQuery<Project | null>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      try {
        return await getProject(projectId);
      } catch (err) {
        addToast({
          icon: "error",
          title: "No se pudo cargar el proyecto",
          message: errorText(err),
        });
        throw err;
      }
    },
    enabled: Number.isSafeInteger(projectId) && projectId > 0,
    staleTime: 1000 * 60 * 5,
  });

  const setProject: Dispatch<SetStateAction<Project | null>> = useCallback(
    (updater) => {
      queryClient.setQueryData<Project | null>(
        ["project", projectId],
        (prev = null) => {
          return typeof updater === "function" ? updater(prev) : updater;
        },
      );
    },
    [queryClient, projectId],
  );

  const toggleFavorite = useCallback(async () => {
    if (!project || favoriteLock.current) return;
    favoriteLock.current = true;
    setFavoritePending(true);
    setFavoriteError("");
    const nextFavorite = !project.is_favorite;
    setProject((prev) =>
      prev ? { ...prev, is_favorite: nextFavorite } : prev,
    );
    try {
      await setProjectFavorite(projectId, nextFavorite);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (err) {
      setFavoriteError(errorText(err));
      setProject((prev) =>
        prev ? { ...prev, is_favorite: !nextFavorite } : prev,
      );
      addToast({
        icon: "error",
        title: "Error al actualizar favorito",
        message: errorText(err),
      });
    } finally {
      favoriteLock.current = false;
      setFavoritePending(false);
    }
  }, [project, projectId, setProject, queryClient, addToast]);

  return { project, refetch, setProject, toggleFavorite, favoritePending, favoriteError };
}
