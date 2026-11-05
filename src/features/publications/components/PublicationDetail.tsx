import { useState } from "react";
import type {
  Publication,
  PublicationStateCode,
} from "../../../core/interfaces/publication.interface";
import Modal from "../../../shared/Modal/Modal";
import CalendarIcon from "../../../shared/icons/CalendarIcon";
import ClockIcon from "../../../shared/icons/ClockIcon";
import UserIcon from "../../../shared/icons/UserIcon";
import {
  LEVEL_LABELS,
  PUBLICATION_STATE_HINTS,
  closingHint,
  formatPublicationDateRange,
  publicationFeedback,
} from "../utils/publication";

interface PublicationDetailProps {
  publication: Publication;
  canManage?: boolean;
  editDisabled?: boolean;
  applied?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onChangeState?: (state: PublicationStateCode) => Promise<void>;
  onApply?: () => Promise<void>;
}

type TransitionState = "ABIERTA" | "CERRADA" | "CANCELADA";
type ConfirmState = Exclude<TransitionState, "ABIERTA">;

const transitionLabels: Record<TransitionState, string> = {
  ABIERTA: "Publicar oferta",
  CERRADA: "Cerrar oferta",
  CANCELADA: "Cancelar oferta",
};

const transitionOrder: TransitionState[] = ["CANCELADA", "CERRADA", "ABIERTA"];

const confirmCopy: Record<ConfirmState, string> = {
  CERRADA:
    "La oferta dejará de mostrarse como oportunidad laboral y no se podrá reabrir.",
  CANCELADA: "La publicación quedará cancelada de forma permanente.",
};

function primaryButton() {
  return `inline-flex cursor-pointer items-center justify-center rounded-lg bg-neutral-800 px-3 py-1.5 text-xs  text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-200`;
}

function secondaryButton() {
  return "inline-flex cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs  text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800";
}

export default function PublicationDetail({
  publication,
  canManage = false,
  editDisabled = false,
  applied = false,
  onClose,
  onEdit,
  onChangeState,
  onApply,
}: PublicationDetailProps) {
  const [confirming, setConfirming] = useState<ConfirmState | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const transitions = canManage
    ? transitionOrder.filter((state) =>
        publication.allowed_states.includes(state),
      )
    : [];
  const canEdit = canManage && publication.permissions.edit;
  const hasActions = canEdit || transitions.length > 0;
  const stateHint = PUBLICATION_STATE_HINTS[publication.state];
  const feedback = publicationFeedback(publication);
  const footerHint =
    publication.state === "ABIERTA"
      ? `${stateHint} ${closingHint(publication.closing_date)}.`
      : stateHint;

  async function applyState(state: PublicationStateCode) {
    if (!onChangeState) return;
    setBusy(true);
    try {
      await onChangeState(state);
      setConfirming(null);
    } catch {
      // El padre muestra el error y conserva la confirmación para reintentar.
    } finally {
      setBusy(false);
    }
  }

  function requestState(state: TransitionState) {
    if (state === "ABIERTA") void applyState(state);
    else setConfirming(state);
  }

  async function handleApply() {
    if (!onApply) return;
    setApplying(true);
    try {
      await onApply();
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      title="Detalle de publicación"
      onClose={onClose}
      busy={busy}
      projectComposer
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
        <p className={`m-0 text-xs ${feedback.text}`}>{feedback.label}</p>
        <h3 className="mt-1 text-lg  text-neutral-800 dark:text-neutral-100">
          {publication.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
          {publication.project.name}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="size-4 text-neutral-400" />
            {publication.available_vacancies} de {publication.vacancies}{" "}
            vacantes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-4 text-neutral-400" />
            {Number(publication.weekly_hours)} h/sem
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-neutral-400" />
            {formatPublicationDateRange(
              publication.opening_date,
              publication.closing_date,
            )}
          </span>
        </div>

        <section className="mt-5">
          <h4 className="text-xs  text-neutral-700 dark:text-neutral-300">
            Descripción
          </h4>
          <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {publication.description}
          </p>
        </section>

        <section className="mt-5">
          <h4 className="text-xs  text-neutral-700 dark:text-neutral-300">
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
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px]  text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                    {requirement.specialty_name}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {LEVEL_LABELS[requirement.minimum_level] ??
                      `Nivel ${requirement.minimum_level}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="shrink-0 border-t border-neutral-200 bg-white px-6 py-3 max-sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
        {confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 min-w-48 flex-1 text-xs text-neutral-700 dark:text-neutral-300">
              {confirmCopy[confirming]}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={secondaryButton()}
                disabled={busy}
                onClick={() => setConfirming(null)}
              >
                Volver
              </button>
              <button
                type="button"
                className={primaryButton()}
                disabled={busy}
                onClick={() => void applyState(confirming)}
              >
                {busy
                  ? "Procesando…"
                  : confirming === "CANCELADA"
                    ? "Sí, cancelar oferta"
                    : "Sí, cerrar oferta"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 min-w-48 flex-1 text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {footerHint}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {transitions.map((state) => (
                <button
                  key={state}
                  type="button"
                  className={
                    state === "ABIERTA"
                      ? primaryButton()
                      : state === "CANCELADA"
                        ? `${secondaryButton()} text-red-700 dark:text-red-400`
                        : secondaryButton()
                  }
                  onClick={() => requestState(state)}
                >
                  {transitionLabels[state]}
                </button>
              ))}
              {canEdit && onEdit && (
                <button
                  type="button"
                  className={secondaryButton()}
                  disabled={editDisabled}
                  title={
                    editDisabled
                      ? "Cargando catálogos para editar"
                      : "Editar publicación"
                  }
                  onClick={onEdit}
                >
                  Editar
                </button>
              )}
              {!canManage &&
                onApply &&
                (applied ? (
                  <span className="text-xs  text-emerald-600 dark:text-emerald-400">
                    Ya te postulaste a esta oferta.
                  </span>
                ) : (
                  <button
                    type="button"
                    className={primaryButton()}
                    disabled={applying || publication.available_vacancies <= 0}
                    onClick={() => void handleApply()}
                  >
                    {applying
                      ? "Postulando..."
                      : publication.available_vacancies <= 0
                        ? "Sin vacantes"
                        : "Postularme"}
                  </button>
                ))}
              {!hasActions && (
                <button
                  type="button"
                  className={secondaryButton()}
                  onClick={onClose}
                >
                  Volver
                </button>
              )}
            </div>
          </div>
        )}
      </footer>
    </Modal>
  );
}
