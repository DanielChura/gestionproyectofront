import { useCallback, useMemo, useState, type ReactNode } from "react";
import { LoadingContext } from "./loadingState";
import type { LoadingContextValue } from "./loadingState";

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [pending, setPending] = useState(0);

  const showLoading = useCallback(() => {
    setLegacyLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setLegacyLoading(false);
  }, []);

  const startLoading = useCallback(() => {
    let active = true;
    setPending((current) => current + 1);
    return () => {
      if (!active) return;
      active = false;
      setPending((current) => current - 1);
    };
  }, []);

  const isLoading = legacyLoading || pending > 0;

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading,
      showLoading,
      hideLoading,
      startLoading,
    }),
    [isLoading, showLoading, hideLoading, startLoading],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}
