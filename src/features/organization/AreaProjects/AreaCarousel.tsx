import FolderIcon from "../../../shared/icons/FolderIcon";
import EditIcon from "../../../shared/icons/EditIcon";
import type { Area } from "../../../core/interfaces/organization.interface";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

interface AreaCarouselProps {
  areas: Area[];
  projects: ProjectSummary[];
  selectedAreaId: number | null;
  onSelectArea: (id: number | null) => void;
  onEditArea: (area: Area) => void;
}

export default function AreaCarousel({
  areas,
  projects,
  selectedAreaId,
  onSelectArea,
  onEditArea,
}: AreaCarouselProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-4 overflow-x-auto pt-2">
        <article
          onClick={() => onSelectArea(null)}
          className={`w-44 shrink-0 cursor-pointer rounded-xl border p-3 ${
            selectedAreaId === null
              ? "border-neutral-400 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800"
              : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <FolderIcon className="size-4 text-yellow-500 shrink-0" />
            <div className="size-6" />
          </div>
          <h3 className="m-0 text-xs font-medium text-neutral-700 dark:text-neutral-100 truncate">
            Todas las áreas
          </h3>
          <p className="m-0 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
          </p>
        </article>

        {areas.map((area) => {
          const projectCount = projects.filter((p) =>
            p.areas?.some((a) => a.id === area.id),
          ).length;
          return (
            <article
              key={area.id}
              onClick={() => onSelectArea(area.id)}
              className={`group w-44 shrink-0 cursor-pointer rounded-xl border p-3 ${
                selectedAreaId === area.id
                  ? "border-neutral-400 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800"
                  : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FolderIcon className="size-4 text-yellow-500 shrink-0" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditArea(area);
                  }}
                  className="cursor-pointer rounded-md p-1.5 text-neutral-400 opacity-0 hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label={`Editar área ${area.name}`}
                >
                  <EditIcon className="size-4" />
                </button>
              </div>
              <h3 className="m-0 text-xs font-medium text-neutral-700 dark:text-neutral-100 truncate">
                {area.name}
              </h3>
              <p className="m-0 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {projectCount} {projectCount === 1 ? "proyecto" : "proyectos"}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}