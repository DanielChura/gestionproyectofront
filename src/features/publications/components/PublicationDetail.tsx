import { useState } from "react";
import type { Publication } from "../../../core/interfaces/publication.interface";
import Button from "../../../shared/components/Button/Button";
import Modal from "../../../shared/components/Modal/Modal";
import { PUBLICATION_STATE_HINTS, closingHint } from "../utils/publication";
import PublicationDetailBody from "./PublicationDetailBody";

interface PublicationDetailProps {
  publication: Publication;
  applied?: boolean;
  canManage?: boolean;
  onClose: () => void;
  onApply?: () => Promise<void>;
  onEdit?: () => void;
}

export default function PublicationDetail({
  publication,
  applied = false,
  canManage = false,
  onClose,
  onApply,
  onEdit,
}: PublicationDetailProps) {
  const [applying, setApplying] = useState(false);
  const stateHint = PUBLICATION_STATE_HINTS[publication.state];
  const footerHint =
    publication.state === "ABIERTA"
      ? `${stateHint} ${closingHint(publication.closing_date)}.`
      : stateHint;

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
    <Modal title="Detalle de publicación" onClose={onClose} busy={applying}>
      <PublicationDetailBody publication={publication} />
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-neutral-200 bg-white px-6 py-3 max-sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="m-0 min-w-48 flex-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {footerHint}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!canManage &&
            onApply &&
            (applied ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Ya te postulaste a esta oferta.
              </span>
            ) : (
              <Button
                type="button"
                disabled={applying || publication.available_vacancies <= 0}
                onClick={() => void handleApply()}
              >
                {applying
                  ? "Postulando..."
                  : publication.available_vacancies <= 0
                    ? "Sin vacantes"
                    : "Postularme"}
              </Button>
            ))}
          {canManage && onEdit && publication.permissions.edit && (
            <Button variant="secondary" type="button" onClick={onEdit}>
              Editar
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={onClose}>
            Volver
          </Button>
        </div>
      </footer>
    </Modal>
  );
}
