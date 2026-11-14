import { useLoading } from "../../../hooks/useLoading";

export function GlobalLoading() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <aside
      role="status"
      aria-label="Cargando contenido"
      className="flex h-full min-h-0 w-full items-center justify-center"
    >
      <video
        src={isDark ? "/loading-dark.webm" : "/loading.webm"}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="size-16"
      />
    </aside>
  );
}
