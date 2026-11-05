import { useId, useState } from "react";
import type { Project } from "../../../../../core/interfaces/task.interface";
import { avatarFor } from "../../../../../shared/Avatar";
import { useAssignmentTeams } from "./useAssignmentTeams";

export default function AssigneeSelector({
  project,
  value,
  onChange,
}: {
  project: Pick<Project, "id" | "participants" | "assignment_teams">;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  const [source, setSource] = useState<"workers" | "teams">("workers");
  const [query, setQuery] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const id = useId();

  const {
    teams,
    error: teamsError,
    loading: teamsLoading,
  } = useAssignmentTeams(
    project.id,
    source === "teams",
    project.assignment_teams,
  );

  const team = teams.find((item) => item.id === teamId);
  const people =
    source === "workers"
      ? project.participants.map((person) => ({
          ...person,
          eligible: true,
          reason: "",
        }))
      : (team?.members ?? []);

  const results = people.filter((person) =>
    person.name
      .toLocaleLowerCase("es")
      .includes(query.trim().toLocaleLowerCase("es")),
  );

  const toggle = (worker: number) =>
    onChange(
      value.includes(worker)
        ? value.filter((item) => item !== worker)
        : [...new Set([...value, worker])],
    );

  return (
    <div className="grid min-w-0 gap-2 text-xs">
      <div
        role="group"
        aria-label="Buscar responsables mediante"
        className="flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-700"
      >
        {(["workers", "teams"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={source === key}
            className="flex-1 cursor-pointer rounded-lg px-2 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 aria-pressed:bg-neutral-800 aria-pressed:text-neutral-100 dark:aria-pressed:bg-neutral-100 dark:aria-pressed:text-neutral-900"
            onClick={() => {
              setSource(key);
              setQuery("");
            }}
          >
            {key === "workers" ? "Trabajadores" : "Equipos"}
          </button>
        ))}
      </div>
      {source === "teams" && (
        <>
          <label
            htmlFor={`${id}-team`}
            className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
          >
            Equipo del área
          </label>
          <select
            id={`${id}-team`}
            name="assignment_team"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            value={teamId ?? ""}
            onChange={(event) =>
              setTeamId(event.target.value ? Number(event.target.value) : null)
            }
          >
            <option value="">Selecciona un equipo</option>
            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.eligible_count} elegibles
              </option>
            ))}
          </select>
          {!teams.length && (
            <p
              role="status"
              className="m-0 text-xs text-neutral-500 dark:text-neutral-400"
            >
              {teamsLoading
                ? "Cargando equipos…"
                : teamsError ||
                  "No hay equipos activos disponibles en el área."}
            </p>
          )}
        </>
      )}
      <label
        htmlFor={id}
        className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
      >
        Buscar integrante del proyecto
      </label>
      <input
        id={id}
        name="responsible_search"
        type="search"
        autoComplete="off"
        placeholder="Buscar por nombre…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      <div
        className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800"
        role="group"
        aria-label="Integrantes elegibles"
      >
        <button
          type="button"
          aria-pressed={!value.length}
          className="w-full cursor-pointer px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 aria-pressed:text-neutral-900 dark:aria-pressed:text-neutral-100"
          onClick={() => onChange([])}
        >
          Sin responsable
        </button>
        {results.map((person) => (
          <button
            key={person.id}
            type="button"
            disabled={!person.eligible}
            aria-pressed={value.includes(person.id)}
            title={person.reason || undefined}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 disabled:cursor-default disabled:opacity-60"
            onClick={() => toggle(person.id)}
          >
            <span
              aria-hidden="true"
              className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-sky-700 text-neutral-100 text-[10px]"
            >
              {avatarFor(person.name)}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {person.name}
              {!person.eligible && (
                <small className="block text-[10px] text-neutral-500">
                  {person.reason}
                </small>
              )}
            </span>
            <span
              aria-hidden="true"
              className="font-semibold text-neutral-800 dark:text-neutral-200"
            >
              {value.includes(person.id) ? "✓" : ""}
            </span>
          </button>
        ))}
        {!results.length && (
          <p
            role="status"
            className="p-3 text-xs text-neutral-500 dark:text-neutral-400"
          >
            {source === "teams" && !team
              ? "Selecciona un equipo para consultar integrantes."
              : "No hay integrantes que coincidan."}
          </p>
        )}
      </div>
      <p
        className="m-0 text-xs text-neutral-500 dark:text-neutral-400"
        aria-live="polite"
      >
        {value.length} responsables seleccionados
      </p>
    </div>
  );
}
