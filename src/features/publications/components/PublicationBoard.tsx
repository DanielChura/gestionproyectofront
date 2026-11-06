import { useEffect, useState } from "react";
import CalendarIcon from "../../../shared/Icons/CalendarIcon";
import ClockIcon from "../../../shared/Icons/ClockIcon";
import DotsIcon from "../../../shared/Icons/DotsIcon";
import UserIcon from "../../../shared/Icons/UserIcon";
import type { Publication } from "../../../core/interfaces/publication.interface";
import {
  formatPublicationDate,
  publicationFeedback,
} from "../utils/publication";

interface PublicationBoardProps {
  publications: Publication[];
  canEdit?: (publication: Publication) => boolean;
  onOpen: (publication: Publication) => void;
  onEdit?: (publication: Publication) => void;
}

export default function PublicationBoard({
  publications,
  canEdit,
  onOpen,
  onEdit,
}: PublicationBoardProps) {
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  useEffect(() => {
    if (openMenu === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMenu]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {publications.map((publication) => {
        const editable = canEdit?.(publication) ?? false;
        const menuOpen = openMenu === publication.id;
        const feedback = publicationFeedback(publication);
        return (
          <article
            key={publication.id}
            className="relative flex flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <button
              type="button"
              onClick={() => onOpen(publication)}
              aria-label={`Ver detalle de ${publication.title}`}
              className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700"
            />

            {menuOpen && (
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => setOpenMenu(null)}
                className="fixed inset-0 z-20 cursor-default"
              />
            )}

            <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${feedback.text}`}>
                  {feedback.label}
                </span>

                <div className="pointer-events-auto relative z-30 -mr-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu(menuOpen ? null : publication.id)
                    }
                    aria-label={`Acciones de ${publication.title}`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="cursor-pointer rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <DotsIcon className="size-4" />
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenu(null);
                          onOpen(publication);
                        }}
                        className="block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        Ver detalle
                      </button>
                      {editable && onEdit && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenu(null);
                            onEdit(publication);
                          }}
                          className="block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          Editar publicación
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <h3 className="line-clamp-1 text-sm  text-neutral-800 dark:text-neutral-100">
                  {publication.title}
                </h3>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {publication.project.name}
                </p>
              </div>
              <p className="line-clamp-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                {publication.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-neutral-600 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="size-4 text-neutral-400" />
                  {publication.available_vacancies}{" "}
                  {publication.available_vacancies === 1
                    ? "vacante"
                    : "vacantes"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-4 text-neutral-400" />
                  {Number(publication.weekly_hours)} h/sem
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon className="size-4 text-neutral-400" />
                  {formatPublicationDate(publication.closing_date)}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
