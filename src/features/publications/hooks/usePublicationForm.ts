import { useState } from "react";
import type { FormEvent } from "react";
import type {
  Publication,
  PublicationCreateData,
  PublicationStateCode,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";
import type { PublicationDraft } from "../utils/publication";
import { publicationErrorText } from "../../../core/services/publicationService";
import { useToast } from "../../../hooks/useToast";
import { addDaysIso, isoToday, validatePublicationDraft } from "../utils/publication";

function initialDraft(publication?: Publication): PublicationDraft {
  if (!publication)
    return {
      projectId: "",
      title: "",
      description: "",
      vacancies: "1",
      weeklyHours: "40",
      openingDate: isoToday(),
      closingDate: addDaysIso(isoToday(), 30),
      requirements: [],
    };
  return {
    projectId: String(publication.project.id),
    title: publication.title,
    description: publication.description,
    vacancies: String(publication.vacancies),
    weeklyHours: publication.weekly_hours,
    openingDate: publication.opening_date,
    closingDate: publication.closing_date,
    requirements: publication.requirements.map((item) => ({
      specialty_id: item.specialty_id,
      minimum_level: item.minimum_level,
    })),
  };
}

export function usePublicationForm(
  publication: Publication | undefined,
  specialties: { id: number }[],
  levels: number[],
  onSubmit: (payload: PublicationCreateData | PublicationUpdateData) => Promise<void>,
  onClose: () => void,
) {
  const [draft, setDraft] = useState<PublicationDraft>(() =>
    initialDraft(publication),
  );
  const [state, setState] = useState<PublicationStateCode>(
    publication?.state ?? "BORRADOR",
  );
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  function updateField<K extends keyof PublicationDraft>(
    field: K,
    value: PublicationDraft[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateRequirement(index: number, changes: Partial<PublicationDraft["requirements"][number]>) {
    setDraft((current) => ({
      ...current,
      requirements: current.requirements.map((item, position) =>
        position === index ? { ...item, ...changes } : item,
      ),
    }));
  }

  function addRequirement() {
    const used = new Set(draft.requirements.map((item) => item.specialty_id));
    const next = specialties.find((item) => !used.has(item.id));
    if (next)
      setDraft((current) => ({
        ...current,
        requirements: [
          ...current.requirements,
          { specialty_id: next.id, minimum_level: levels[0] ?? 1 },
        ],
      }));
  }

  function removeRequirement(index: number) {
    setDraft((current) => ({
      ...current,
      requirements: current.requirements.filter((_, position) => position !== index),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validatePublicationDraft(draft, {
      requireProject: !publication,
      state: publication?.state,
    });
    if (Object.keys(errors).length) {
      addToast({
        icon: "error",
        title: "Revisa los campos",
        message: "Completa los datos requeridos.",
      });
      return;
    }
    const base: PublicationUpdateData = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      vacancies: Number(draft.vacancies),
      weekly_hours: Number(draft.weeklyHours).toFixed(2),
      opening_date: draft.openingDate,
      closing_date: draft.closingDate,
      state,
      requirements: draft.requirements,
    };
    setBusy(true);
    try {
      await onSubmit(
        publication ? base : { ...base, project_id: Number(draft.projectId) },
      );
      onClose();
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo guardar",
        message: publicationErrorText(failure),
      });
    } finally {
      setBusy(false);
    }
  }

  return {
    draft,
    state,
    setState,
    busy,
    submit,
    updateField,
    updateRequirement,
    addRequirement,
    removeRequirement,
    closingMin:
      publication?.state === "ABIERTA" && draft.openingDate < isoToday()
        ? isoToday()
        : draft.openingDate || undefined,
  };
}
