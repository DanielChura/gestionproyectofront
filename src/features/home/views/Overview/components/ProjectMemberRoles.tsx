import Select from "../../../../../shared/components/Select/Select";
import type {
  Project,
  ProjectMemberRole,
} from "../../../../../core/interfaces/task.interface";

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  COLABORADOR: "Colaborador",
  RESPONSABLE: "Responsable",
  REVISOR: "Revisor",
};

interface ProjectMemberRolesProps {
  participants: Project["participants"];
  canManage: boolean;
  onChange: (workerId: number, role: ProjectMemberRole) => Promise<void>;
}

export default function ProjectMemberRoles({
  participants,
  canManage,
  onChange,
}: ProjectMemberRolesProps) {
  if (participants.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      aria-label="Equipo del proyecto"
    >
      <h2 className="m-0 mb-3 text-xs text-neutral-700 dark:text-neutral-100">
        Equipo del proyecto
      </h2>

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-xs"
          >
            <span className="min-w-0 flex-1 truncate">{participant.name}</span>
            {canManage ? (
              <div className="w-36 shrink-0">
                <Select
                  value={participant.role}
                  aria-label={`Rol de ${participant.name}`}
                  onChange={(event) =>
                    void onChange(
                      participant.id,
                      event.target.value as ProjectMemberRole,
                    )
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="text-neutral-500 dark:text-neutral-400">
                {ROLE_LABELS[participant.role]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
