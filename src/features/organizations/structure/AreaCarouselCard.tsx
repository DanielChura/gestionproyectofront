import FolderIcon from "../../../shared/icons/FolderIcon";
import EditIcon from "../../../shared/icons/EditIcon";
import type { Area } from "../../../core/interfaces/organization.interface";

interface AreaCarouselCardProps {
  area: Area;
  isSelected: boolean;
  projectCount: number;
  onSelect: (id: number) => void;
  onEdit: (area: Area) => void;
}

export default function AreaCarouselCard({
  area,
  isSelected,
  projectCount,
  onSelect,
  onEdit,
}: AreaCarouselCardProps) {
  return (
    <article
      onClick={() => onSelect(area.id)}
      className={`group shrink-0 w-44 p-3 rounded-xl border cursor-pointer ${
        isSelected
          ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800/80"
          : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <FolderIcon className="size-4 text-yellow-500 shrink-0" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(area);
          }}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 opacity-0 group-hover:opacity-100 cursor-pointer"
          title={`Editar área ${area.name}`}
        >
          <EditIcon className="size-4" />
        </button>
      </div>

      <h3 className="m-0 text-xs font-medium text-neutral-800 dark:text-neutral-100 truncate">
        {area.name}
      </h3>
      <p className="m-0 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {projectCount} {projectCount === 1 ? "proyecto" : "proyectos"}
      </p>
    </article>
  );
}
