import type { Publication } from "../../../core/interfaces/publication.interface";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ClockIcon from "../../../shared/icons/ClockIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import {
  LEVEL_LABELS,
  formatPublicationDateRange,
  publicationFeedback,
} from "../utils/publication";

export default function PublicationDetailBody({
  publication,
}: {
  publication: Publication;
}) {
  const feedback = publicationFeedback(publication);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
      <p className={`m-0 text-xs ${feedback.text}`}>{feedback.label}</p>
      <h3 className="mt-1 text-lg text-neutral-700 dark:text-neutral-100">
        {publication.title}
      </h3>
      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
        {publication.project.name}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <UserIcon className="size-4" />
          {publication.available_vacancies} de {publication.vacancies} vacantes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="size-4" />
          {Number(publication.weekly_hours)} h/sem
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarIcon className="size-4" />
          {formatPublicationDateRange(
            publication.opening_date,
            publication.closing_date,
          )}
        </span>
      </div>
      <h4 className="mt-5 text-xs text-neutral-700 dark:text-neutral-300">
        Descripción
      </h4>
      <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        {publication.description}
      </p>
      <h4 className="mt-5 text-xs text-neutral-700 dark:text-neutral-300">
        Requisitos
      </h4>
      {publication.requirements.length === 0 ? (
        <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          Sin especialidades específicas.
        </p>
      ) : (
        <ul className="mt-1.5 flex list-none flex-wrap gap-2 p-0">
          {publication.requirements.map((requirement) => (
            <li
              key={requirement.specialty_id}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400"
            >
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                {requirement.specialty_name}
              </span>
              {LEVEL_LABELS[requirement.minimum_level] ??
                `Nivel ${requirement.minimum_level}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
