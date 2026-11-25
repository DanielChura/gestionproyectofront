import type { Publication } from "../../../core/interfaces/publication.interface";
import Avatar from "../../../shared/Avatar";
import Button from "../../../shared/components/Button/Button";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import { formatPublicationDate } from "../utils/publication";

interface PublicationListProps {
  publications: Publication[];
  onOpen: (publication: Publication) => void;
  onApply: (publication: Publication) => void;
}

export default function PublicationList({
  publications,
  onOpen,
  onApply,
}: PublicationListProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {publications.map((publication) => (
        <article
          key={publication.id}
          className="flex flex-col rounded-xl h-70 border border-neutral-200 bg-neutral-50 p-4 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/40"
        >
          <button
            type="button"
            onClick={() => onOpen(publication)}
            className="flex flex-col text-left"
          >
            <Avatar
              name={publication.project.name}
              className="size-9 rounded-lg"
            />
            <p className="mt-3   truncate text-xs text-neutral-600 dark:text-neutral-400">
              {publication.project.name}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-base text-neutral-700 dark:text-neutral-100">
              {publication.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {publication.requirements.map((requirement) => (
                <span
                  key={requirement.specialty_id}
                  className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {requirement.specialty_name}
                </span>
              ))}
            </div>
          </button>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="size-4" />
                {publication.available_vacancies} vac.
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="size-4" />
                {formatPublicationDate(publication.closing_date)}
              </span>
            </div>
            <Button
              variant="primary"
              type="button"
              disabled={!publication.can_apply}
              onClick={() => onApply(publication)}
            >
              {publication.applied ? "Ya aplicaste" : "Aplicar ahora"}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
