import ProjectWorkerSearch from "./ProjectWorkerSearch";
import ProjectWorkerResults from "./ProjectWorkerResults";
import type { ProjectCreationEditor } from "./useProjectCreation";
import ProjectTeamPicker from "./ProjectTeamPicker";
export default function ProjectMemberPicker({
  editor,
}: {
  editor: ProjectCreationEditor;
}) {
  const { draft, update, workers, teams, fields } = editor;
  const team = draft.participantSource === "teams",
    result = team ? teams : workers;
  return (
    <div
      id="project-members"
      tabIndex={-1}
      aria-invalid={!!fields.worker_ids}
      aria-describedby={fields.worker_ids ? "project-members-error" : undefined}
      className="grid min-w-0 gap-2"
    >
      <div
        role="group"
        aria-label="Origen de participantes"
        className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800"
      >
        {(["workers", "teams"] as const).map((source) => (
          <button
            key={source}
            type="button"
            aria-pressed={(draft.participantSource ?? "workers") === source}
            onClick={() => {
              if (draft.participantSource !== source)
                update({
                  participantSource: source,
                  workerIds: [],
                  teamIds: [],
                });
            }}
            className="flex-1 cursor-pointer rounded-lg px-3 py-1.5 hover:bg-neutral-200 aria-pressed:bg-white dark:hover:bg-neutral-700 dark:aria-pressed:bg-neutral-900"
          >
            {source === "workers" ? "Trabajadores" : "Equipos"}
          </button>
        ))}
      </div>
      {!team && <ProjectWorkerSearch editor={editor} />}
      {result.isError ? (
        <p role="alert">
          No se pudieron cargar los participantes.{" "}
          <button
            type="button"
            onClick={() => void result.refetch()}
            className="cursor-pointer underline"
          >
            Reintentar
          </button>
        </p>
      ) : result.isPending ? (
        <p role="status">Consultando participantes…</p>
      ) : team ? (
        <ProjectTeamPicker editor={editor} />
      ) : (
        <ProjectWorkerResults editor={editor} />
      )}
      {fields.worker_ids && (
        <p
          id="project-members-error"
          role="alert"
          className="text-red-700 dark:text-red-400"
        >
          {fields.worker_ids}
        </p>
      )}
    </div>
  );
}
