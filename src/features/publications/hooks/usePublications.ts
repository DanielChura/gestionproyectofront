import { useCallback, useEffect, useState } from "react";
import type {
  Publication,
  PublicationCreateData,
  PublicationFilters,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";
import {
  applyToPublication,
  createPublication,
  listPublications,
  publicationErrorText,
  updatePublication,
} from "../../../core/services/publicationService";
import { publicationMatchesFilters } from "../utils/publication";

export function usePublications({
  search,
  state,
  project_id: projectId,
}: PublicationFilters = {}) {
  const [data, setData] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listPublications({ search, state, project_id: projectId })
      .then((response) => {
        if (!active) return;
        setData(Array.isArray(response) ? response : []);
        setError("");
      })
      .catch((failure: unknown) => {
        if (active) setError(publicationErrorText(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, state, projectId, reloadKey]);

  const refetch = useCallback(() => setReloadKey((key) => key + 1), []);

  const matches = useCallback(
    (publication: Publication) =>
      publicationMatchesFilters(publication, {
        search,
        state,
        project_id: projectId,
      }),
    [search, state, projectId],
  );

  const create = useCallback(
    async (payload: PublicationCreateData) => {
      const created = await createPublication(payload);
      setData((current) =>
        matches(created)
          ? [created, ...current.filter((item) => item.id !== created.id)]
          : current,
      );
      return created;
    },
    [matches],
  );

  const update = useCallback(
    async (publicationId: number, payload: PublicationUpdateData) => {
      const updated = await updatePublication(publicationId, payload);
      setData((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .filter(matches),
      );
      return updated;
    },
    [matches],
  );

  const apply = useCallback(
    async (publicationId: number) => {
      const updated = await applyToPublication(publicationId);
      setData((current) =>
        current
          .map((item) => (item.id === updated.id ? updated : item))
          .filter(matches),
      );
      return updated;
    },
    [matches],
  );

  return { data, loading, error, refetch, create, update, apply };
}
