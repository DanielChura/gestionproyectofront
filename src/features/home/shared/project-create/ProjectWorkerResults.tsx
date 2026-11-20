import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectWorkerResults({
  editor,
}: {
  editor: ProjectCreationEditor;
}) {
  const { draft, workers, update } = editor;
  return (
    <>
      <div
        role="group"
        aria-label="Trabajadores elegibles"
        className="grid gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
      >
        {workers.data?.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-2"
          >
            <input
              type="checkbox"
              name="worker_id"
              checked={draft.workerIds.includes(item.id)}
              onChange={(event) =>
                update({
                  workerIds: event.target.checked
                    ? [...draft.workerIds, item.id]
                    : draft.workerIds.filter((id) => id !== item.id),
                })
              }
            />
            <span className="min-w-0 break-words">
              {item.name}
              <small className="mt-1 block text-neutral-600 dark:text-neutral-400">
                {item.project_count} proyectos relacionados
              </small>
            </span>
          </label>
        ))}
        {!workers.data?.length && (
          <p role="status">No hay participantes elegibles.</p>
        )}
      </div>
      <p role="status" className="text-neutral-600 dark:text-neutral-400">
        {draft.workerIds.length} seleccionados. Hasta 100 resultados; afina la
        búsqueda si hace falta.
      </p>
    </>
  );
}
