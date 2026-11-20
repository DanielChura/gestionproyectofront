import type { ProjectCreationEditor } from "./useProjectCreation";
export default function ProjectTeamPicker({
  editor,
}: {
  editor: ProjectCreationEditor;
}) {
  const { draft, teams, update } = editor,
    ids = draft.teamIds ?? [];
  const people = new Set(
    teams.data
      ?.filter((team) => ids.includes(team.id))
      .flatMap((team) =>
        team.members
          .filter((person) => person.eligible)
          .map((person) => person.id),
      ),
  );
  return (
    <>
      <div
        role="group"
        aria-label="Equipos elegibles"
        className="grid gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-700"
      >
        {teams.data?.map((item) => (
          <div
            key={item.id}
            className="border-b border-neutral-200 pb-2 last:border-0 last:pb-0 dark:border-neutral-700"
          >
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                name="team_id"
                disabled={!item.eligible_count}
                checked={ids.includes(item.id)}
                onChange={(event) =>
                  update({
                    teamIds: event.target.checked
                      ? [...ids, item.id]
                      : ids.filter((id) => id !== item.id),
                  })
                }
              />
              <span className="min-w-0 break-words">
                {item.name}
                <small className="mt-1 block text-neutral-600 dark:text-neutral-400">
                  {item.eligible_count} integrantes elegibles
                  {!item.eligible_count && " · No aporta participantes"}
                </small>
              </span>
            </label>
            <details className="ml-5 mt-1">
              <summary className="cursor-pointer rounded py-1 text-neutral-600 dark:text-neutral-400">
                Ver integrantes
              </summary>
              <ul className="grid gap-1 break-words">
                {item.members.map((person) => (
                  <li key={person.id}>{person.name}</li>
                ))}
              </ul>
            </details>
          </div>
        ))}
        {!teams.data?.length && (
          <p role="status">No hay equipos activos en el área.</p>
        )}
      </div>
      <p role="status" className="text-neutral-600 dark:text-neutral-400">
        {ids.length} equipos · {people.size} trabajadores únicos
      </p>
    </>
  );
}
