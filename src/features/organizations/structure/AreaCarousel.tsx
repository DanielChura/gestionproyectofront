import { useRef } from "react";
import ChevronIcon from "../../../shared/icons/ChevronIcon";
import PlusIcon from "../../../shared/icons/PlusIcon";
import AllAreasCard from "./AllAreasCard";
import AreaCarouselCard from "./AreaCarouselCard";
import type { Area } from "../../../core/interfaces/organization.interface";
import type { ProjectSummary } from "../../../core/interfaces/project.interface";

interface AreaCarouselProps {
  areas: Area[];
  projects: ProjectSummary[];
  selectedAreaId: number | null;
  onSelectArea: (id: number | null) => void;
  onNewArea: () => void;
  onEditArea: (area: Area) => void;
}

export default function AreaCarousel({
  areas,
  projects,
  selectedAreaId,
  onSelectArea,
  onNewArea,
  onEditArea,
}: AreaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="m-0 text-sm font-medium text-neutral-800 dark:text-neutral-100">
          Áreas operativas
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onNewArea}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
          >
            <PlusIcon className="size-4" />
            <span>Crear área</span>
          </button>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-400 cursor-pointer"
            title="Desplazar a la izquierda"
          >
            <ChevronIcon className="size-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-400 cursor-pointer"
            title="Desplazar a la derecha"
          >
            <ChevronIcon className="size-4 -rotate-90" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-2 scroll-smooth"
      >
        <AllAreasCard
          isSelected={selectedAreaId === null}
          totalProjects={projects.length}
          onSelect={() => onSelectArea(null)}
        />
        {areas.map((area) => (
          <AreaCarouselCard
            key={area.id}
            area={area}
            isSelected={selectedAreaId === area.id}
            projectCount={
              projects.filter((p) => p.areas?.some((a) => a.id === area.id))
                .length
            }
            onSelect={onSelectArea}
            onEdit={onEditArea}
          />
        ))}
      </div>
    </section>
  );
}
