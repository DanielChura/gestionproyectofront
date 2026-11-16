import ClockIcon from "../../shared/icons/ClockIcon";
import TrashIcon from "../../shared/icons/TrashIcon";
import { avatarFor } from "../../shared/avatarUtils";
import { initialColor } from "../../utils/initialColor";
import type { TeamMember } from "../../core/interfaces/organization.interface";

interface TeamMemberCardProps {
  member: TeamMember;
  canManage: boolean;
  busy: boolean;
  onRemove: (memberId: number) => void;
}

export default function TeamMemberCard({
  member,
  canManage,
  busy,
  onRemove,
}: TeamMemberCardProps) {
  const isActive = member.left_date == null;

  return (
    <article className="group flex flex-col rounded-2xl border border-neutral-200 transition-colors dark:border-neutral-800">
      <div className="p-2 pb-0">
        <div
          className={`relative flex aspect-square w-full items-center justify-center rounded-xl ${initialColor(member.worker_name)} text-white`}
        >
          <span className="text-4xl  tracking-tight">
            {avatarFor(member.worker_name)}
          </span>
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white p-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-neutral-900">
            <button
              type="button"
              disabled={!canManage || busy}
              onClick={() => onRemove(member.id)}
              aria-label={`Quitar a ${member.worker_name}`}
              title={canManage ? "Quitar integrante" : "Solo administradores"}
              className="inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 text-neutral-600 dark:text-neutral-200">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 max-w-50 truncate text-xs ">{member.worker_name}</p>
          <span
            title={isActive ? "Activo" : "Inactivo"}
            className={`size-2 shrink-0 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
        </div>

        <div className="ml-1 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 shrink-0" fill={false} />
            <span className="truncate">Ingreso {member.joined_date}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
