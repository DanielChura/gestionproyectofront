import FolderIcon from "../../../shared/icons/FolderIcon";

interface AllAreasCardProps {
  isSelected: boolean;
  totalProjects: number;
  onSelect: () => void;
}

export default function AllAreasCard({
  isSelected,
  totalProjects,
  onSelect,
}: AllAreasCardProps) {
  return (
    <article
      onClick={onSelect}
      className={`shrink-0 w-44 p-3 rounded-xl border cursor-pointer ${
        isSelected
          ? "border-neutral-900 bg-neutral-50 dark:border-neutral-100 dark:bg-neutral-800/80"
          : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <FolderIcon className="size-4 text-yellow-500 shrink-0" />
        <div className="size-6" />
      </div>

      <h3 className="m-0 text-xs font-medium text-neutral-800 dark:text-neutral-100 truncate">
        Todas las áreas
      </h3>
      <p className="m-0 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {totalProjects} {totalProjects === 1 ? "proyecto" : "proyectos"}
      </p>
    </article>
  );
}
