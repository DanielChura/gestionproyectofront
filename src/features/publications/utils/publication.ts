import type {
  Publication,
  PublicationFilters,
  PublicationRequirementWriteData,
  PublicationStateCode,
} from "../../../core/interfaces/publication.interface";

export const PUBLICATION_STATE_LABELS: Record<PublicationStateCode, string> = {
  BORRADOR: "Borrador",
  ABIERTA: "Abierta",
  CERRADA: "Cerrada",
  CANCELADA: "Cancelada",
};

export const PUBLICATION_STATE_HINTS: Record<PublicationStateCode, string> = {
  BORRADOR: "Solo administradores pueden ver este borrador.",
  ABIERTA: "Visible para los trabajadores de las áreas del proyecto.",
  CERRADA: "La publicación está cerrada y ya no se muestra como oportunidad.",
  CANCELADA: "La publicación fue cancelada de forma permanente.",
};

export const LEVEL_LABELS: Record<number, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Avanzado",
};

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "set",
  "oct",
  "nov",
  "dic",
];

export interface PublicationDraft {
  projectId: string;
  title: string;
  description: string;
  vacancies: string;
  weeklyHours: string;
  openingDate: string;
  closingDate: string;
  requirements: PublicationRequirementWriteData[];
}

export function isoToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addDaysIso(iso: string, days: number): string {
  const date = readIsoDate(iso);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return [
    // String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function readIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

export function formatPublicationDate(iso: string): string {
  const date = readIsoDate(iso);
  if (!date) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}.`;
}

export function formatPublicationDateShort(iso: string): string {
  const date = readIsoDate(iso);
  if (!date) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatPublicationDateRange(
  openingDate: string,
  closingDate: string,
): string {
  return `${formatPublicationDate(openingDate)} – ${formatPublicationDate(closingDate)}`;
}

export function daysUntil(iso: string, today = isoToday()): number {
  const target = readIsoDate(iso);
  const start = readIsoDate(today);
  if (!target || !start) return Number.NaN;
  return Math.round(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000,
  );
}

export function closingHint(iso: string, today = isoToday()): string {
  const days = daysUntil(iso, today);
  if (Number.isNaN(days)) return "Sin fecha de cierre";
  if (days < 0) return `Cerró el ${formatPublicationDateShort(iso)}`;
  if (days === 0) return "Cierra hoy";
  if (days === 1) return "Cierra mañana";
  if (days <= 7) return `Cierra en ${days} días`;
  return `Cierra el ${formatPublicationDateShort(iso)}`;
}

export interface PublicationFeedback {
  label: string;
  text: string;
}

export function publicationFeedback(
  publication: Publication,
  today = isoToday(),
): PublicationFeedback {
  if (publication.state === "BORRADOR")
    return {
      label: "Sin publicar",
      text: "text-yellow-600 dark:text-yellow-400",
    };
  if (publication.state === "CANCELADA")
    return {
      label: "Proceso cancelado",
      text: "text-red-600 dark:text-red-400",
    };
  if (publication.state === "CERRADA")
    return {
      label: "Proceso cerrado",
      text: "text-neutral-500 dark:text-neutral-400",
    };

  if (publication.available_vacancies < 2)
    return {
      label:
        publication.available_vacancies <= 0
          ? "Cupos completos"
          : "Últimas vacantes",
      text: "text-sky-600 dark:text-sky-400",
    };

  const closing = daysUntil(publication.closing_date, today);
  if (closing >= 0 && closing <= 3)
    return {
      label: "Cierra pronto",
      text: "text-yellow-600 dark:text-yellow-400",
    };

  const opening = daysUntil(publication.opening_date, today);
  if (opening >= -3 && opening <= 0)
    return {
      label: "Recién publicado",
      text: "text-emerald-600 dark:text-emerald-400",
    };

  return {
    label: "Vacantes disponibles",
    text: "text-emerald-600 dark:text-emerald-400",
  };
}

export function publicationMatchesFilters(
  publication: Publication,
  filters: PublicationFilters | undefined,
): boolean {
  if (!filters) return true;
  if (filters.project_id && publication.project.id !== filters.project_id)
    return false;
  if (filters.state && publication.state !== filters.state) return false;
  const search = filters.search?.trim().toLocaleLowerCase("es");
  if (
    search &&
    !publication.title.toLocaleLowerCase("es").includes(search) &&
    !publication.project.name.toLocaleLowerCase("es").includes(search)
  )
    return false;
  return true;
}

interface ValidationOptions {
  requireProject: boolean;
  state?: PublicationStateCode;
  today?: string;
}

export function validatePublicationDraft(
  draft: PublicationDraft,
  { requireProject, state, today = isoToday() }: ValidationOptions,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (requireProject) {
    const projectId = Number(draft.projectId);
    if (!Number.isInteger(projectId) || projectId < 1)
      errors.project_id = "Selecciona un proyecto.";
  }

  const title = draft.title.trim();
  if (!title) errors.title = "Indica el título de la publicación.";
  else if (title.length > 180)
    errors.title = "El título no puede superar los 180 caracteres.";

  const description = draft.description.trim();
  if (!description) errors.description = "Describe la oferta de empleo.";
  else if (description.length > 10_000)
    errors.description =
      "La descripción no puede superar los 10 000 caracteres.";

  const vacancies = Number(draft.vacancies);
  if (!Number.isInteger(vacancies) || vacancies < 1 || vacancies > 65_535)
    errors.vacancies = "Indica entre 1 y 65 535 vacantes.";

  const weeklyHours = Number(draft.weeklyHours);
  if (!Number.isFinite(weeklyHours) || weeklyHours < 0.01 || weeklyHours > 168)
    errors.weekly_hours = "Indica entre 0.01 y 168 horas semanales.";

  if (!readIsoDate(draft.openingDate))
    errors.opening_date = "Indica la fecha de apertura.";
  if (!readIsoDate(draft.closingDate))
    errors.closing_date = "Indica la fecha de cierre.";
  else if (!errors.opening_date && draft.closingDate < draft.openingDate)
    errors.closing_date =
      "La fecha de cierre no puede ser anterior a la apertura.";
  else if (state === "ABIERTA" && daysUntil(draft.closingDate, today) < 0)
    errors.closing_date = "La fecha de cierre ya pasó.";

  if (draft.requirements.length > 50)
    errors.requirements = "Puedes agregar hasta 50 requisitos.";
  else if (
    new Set(draft.requirements.map((item) => item.specialty_id)).size !==
    draft.requirements.length
  )
    errors.requirements = "No se permiten especialidades duplicadas.";
  else if (
    draft.requirements.some(
      (item) =>
        !Number.isInteger(item.specialty_id) ||
        item.specialty_id < 1 ||
        ![1, 2, 3].includes(item.minimum_level),
    )
  )
    errors.requirements = "Revisa las especialidades y sus niveles.";

  return errors;
}
