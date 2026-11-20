import EditIcon from "../../shared/icons/EditIcon";
import AtIcon from "../../shared/icons/AtIcon";
import HashIcon from "../../shared/icons/HashIcon";
import { avatarFor } from "../../shared/avatarUtils";
import { initialColor } from "../../utils/initialColor";
import type { Worker } from "../../core/interfaces/worker.interface";

interface WorkerCardProps {
  worker: Worker;
  areaName: string;
  canManage: boolean;
  onEdit: (worker: Worker) => void;
}

export default function WorkerCard({
  worker,
  areaName,
  canManage,
  onEdit,
}: WorkerCardProps) {
  const name = `${worker.first_names} ${worker.last_names}`;

  return (
    <article className="group flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="p-2 pb-0">
        <div
          className={`relative flex aspect-square w-full items-center justify-center rounded-xl ${initialColor(name)} text-neutral-100`}
        >
          <span className="text-4xl tracking-tight">{avatarFor(name)}</span>
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white p-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-neutral-900">
            <button
              type="button"
              disabled={!canManage}
              onClick={() => onEdit(worker)}
              title={canManage ? "Editar trabajador" : "Solo administradores"}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <EditIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 text-neutral-600 dark:text-neutral-200">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 max-w-50 truncate text-xs">{name}</p>
          <span
            title={worker.active ? "Activo" : "Inactivo"}
            className={`size-2 shrink-0 rounded-full ${
              worker.active ? "bg-emerald-500" : "bg-neutral-400"
            }`}
          />
        </div>

        <div className="ml-1 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <AtIcon className="size-4 shrink-0" fill={false} />
            <span className="truncate">{worker.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <HashIcon className="size-4 shrink-0" fill={false} />
            <span className="truncate">{worker.code}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
