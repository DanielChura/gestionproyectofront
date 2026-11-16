import { useCallback, useEffect, useState } from "react";
import type { PublicationCatalogs } from "../../../core/interfaces/publication.interface";
import {
  getPublicationCatalogs,
  publicationErrorText,
} from "../../../core/services/publicationService";

export function usePublicationCatalogs(enabled: boolean) {
  const [data, setData] = useState<PublicationCatalogs | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getPublicationCatalogs()
      .then((catalogs) => {
        if (!active) return;
        setData(catalogs);
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
  }, [enabled, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  return { data, loading, error, retry };
}
