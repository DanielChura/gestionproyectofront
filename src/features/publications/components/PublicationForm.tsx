import { useRef, useState } from "react";
import type { FormEvent } from "react";
import PlusIcon from "../../../shared/Icons/PlusIcon";
import TrashIcon from "../../../shared/Icons/TrashIcon";
import Form from "../../../shared/Form/Form";
import Input from "../../../shared/Input/Input";
import Select from "../../../shared/Select/Select";
import { useToast } from "../../../hooks/useToast";
import { publicationErrorText } from "../../../core/services/publicationService";
import {
  LEVEL_LABELS,
  PUBLICATION_STATE_LABELS,
  addDaysIso,
  isoToday,
  validatePublicationDraft,
} from "../utils/publication";
import type { PublicationDraft } from "../utils/publication";
import type {
  Publication,
  PublicationCatalogs,
  PublicationCreateData,
  PublicationStateCode,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";

interface PublicationFormProps {
  publication?: Publication;
  catalogs: PublicationCatalogs;
  onClose: () => void;
  onSubmit: (
    payload: PublicationCreateData | PublicationUpdateData,
  ) => Promise<void>;
}

function initialDraft(publication?: Publication): PublicationDraft {
  if (publication)
    return {
      projectId: String(publication.project.id),
      title: publication.title,
      description: publication.description,
      vacancies: String(publication.vacancies),
      weeklyHours: publication.weekly_hours,
      openingDate: publication.opening_date,
      closingDate: publication.closing_date,
      requirements: publication.requirements.map((r) => ({
        specialty_id: r.specialty_id,
        minimum_level: r.minimum_level,
      })),
    };
  const today = isoToday();
  return {
    projectId: "",
    title: "",
    description: "",
    vacancies: "1",
    weeklyHours: "40",
    openingDate: today,
    closingDate: addDaysIso(today, 30),
    requirements: [],
  };
}

const textareaClass =
  "w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-600 dark:placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none resize-y";

export default function PublicationForm({
  publication,
  catalogs,
  onClose,
  onSubmit,
}: PublicationFormProps) {
  const [draft, setDraft] = useState<PublicationDraft>(() =>
    initialDraft(publication),
  );
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const editing = publication !== undefined;
  const levels = catalogs.levels.length ? catalogs.levels : [1, 2, 3];
  const [selectedState, setSelectedState] = useState<PublicationStateCode>(
    publication?.state ?? "BORRADOR",
  );
  const closingMin =
    publication?.state === "ABIERTA" && draft.openingDate < isoToday()
      ? isoToday()
      : draft.openingDate || undefined;

  function updateField<K extends keyof PublicationDraft>(
    field: K,
    value: PublicationDraft[K],
  ) {
    setDraft((c) => ({ ...c, [field]: value }));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validatePublicationDraft(draft, {
      requireProject: !editing,
      state: publication?.state,
      today: isoToday(),
    });
    if (Object.keys(validation).length) {
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
      state: selectedState,
      requirements: draft.requirements.map((r) => ({
        specialty_id: r.specialty_id,
        minimum_level: r.minimum_level,
      })),
    };
    const payload: PublicationCreateData | PublicationUpdateData = editing
      ? base
      : { ...base, project_id: Number(draft.projectId) };
    setBusy(true);
    try {
      await onSubmit(payload);
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

  const addRequirement = () => {
    const used = new Set(draft.requirements.map((r) => r.specialty_id));
    const next = catalogs.specialties.find((s) => !used.has(s.id));
    if (!next) return;
    setDraft((c) => ({
      ...c,
      requirements: [
        ...c.requirements,
        { specialty_id: next.id, minimum_level: levels[0] ?? 1 },
      ],
    }));
  };

  return (
    <Form
      title={editing ? "Editar publicación" : "Nueva publicación"}
      submitLabel="Guardar"
      size="lg"
      submitting={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      {!editing && (
        <div className="col-span-2 grid gap-1.5">
          <label className="text-xs text-neutral-800 dark:text-neutral-100">
            Proyecto
          </label>
          <Select
            id="publication-project"
            name="project"
            value={draft.projectId}
            onChange={(e) => updateField("projectId", e.target.value)}
          >
            <option value="">Selecciona un proyecto</option>
            {catalogs.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {editing && (
        <div className="col-span-2 grid gap-1.5">
          <label className="text-xs text-neutral-800 dark:text-neutral-100">
            Proyecto
          </label>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-xs  text-neutral-800 dark:text-neutral-100">
            {publication.project.name}
          </div>
        </div>
      )}
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Estado
        </label>
        {editing ? (
          <Select
            id="publication-state"
            name="state"
            value={selectedState}
            onChange={(e) =>
              setSelectedState(e.target.value as PublicationStateCode)
            }
          >
            {Array.from(
              new Set([publication!.state, ...publication!.allowed_states]),
            ).map((s) => (
              <option key={s} value={s}>
                {PUBLICATION_STATE_LABELS[s]}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            id="publication-state"
            name="state"
            value={selectedState}
            onChange={(e) =>
              setSelectedState(e.target.value as PublicationStateCode)
            }
          >
            {(
              ["BORRADOR", "ABIERTA", "CANCELADA"] as PublicationStateCode[]
            ).map((s) => (
              <option key={s} value={s}>
                {PUBLICATION_STATE_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Título
        </label>
        <Input
          id="publication-title"
          name="title"
          type="text"
          maxLength={180}
          value={draft.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Título"
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Descripción
        </label>
        <textarea
          id="publication-description"
          name="description"
          rows={3}
          maxLength={10000}
          value={draft.description}
          onChange={(e) => updateField("description", e.target.value)}
          className={textareaClass}
          placeholder="Descripción"
        />
      </div>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Vacantes
        </label>
        <Input
          id="publication-vacancies"
          name="vacancies"
          type="number"
          min={1}
          max={65535}
          value={draft.vacancies}
          onChange={(e) => updateField("vacancies", e.target.value)}
          placeholder="Vacantes"
        />
      </div>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Horas semanales
        </label>
        <Input
          id="publication-weekly-hours"
          name="weeklyHours"
          type="number"
          min={0.01}
          max={168}
          step={0.01}
          value={draft.weeklyHours}
          onChange={(e) => updateField("weeklyHours", e.target.value)}
          placeholder="Horas semanales"
        />
      </div>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de apertura
        </label>
        <Input
          id="publication-opening-date"
          name="openingDate"
          type="date"
          value={draft.openingDate}
          onChange={(e) => updateField("openingDate", e.target.value)}
        />
      </div>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Fecha de cierre
        </label>
        <Input
          id="publication-closing-date"
          name="closingDate"
          type="date"
          min={closingMin}
          value={draft.closingDate}
          onChange={(e) => updateField("closingDate", e.target.value)}
        />
      </div>
      <fieldset className="col-span-2 grid gap-2 border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg">
        <legend className="text-xs text-neutral-600 dark:text-neutral-400">
          Requisitos
        </legend>
        {draft.requirements.map((req, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <Select
              value={req.specialty_id || ""}
              onChange={(e) => {
                const next = [...draft.requirements];
                next[i] = { ...next[i], specialty_id: Number(e.target.value) };
                setDraft((c) => ({ ...c, requirements: next }));
              }}
            >
              <option value="">Especialidad</option>
              {catalogs.specialties
                .filter(
                  (s) =>
                    s.id === req.specialty_id ||
                    !draft.requirements.some(
                      (r, p) => p !== i && r.specialty_id === s.id,
                    ),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
            <Select
              value={req.minimum_level}
              onChange={(e) => {
                const next = [...draft.requirements];
                next[i] = { ...next[i], minimum_level: Number(e.target.value) };
                setDraft((c) => ({ ...c, requirements: next }));
              }}
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l] ?? `Nivel ${l}`}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() =>
                setDraft((c) => ({
                  ...c,
                  requirements: c.requirements.filter((_, p) => p !== i),
                }))
              }
              className="rounded-lg p-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRequirement}
          disabled={
            draft.requirements.length >= 50 ||
            draft.requirements.length >= catalogs.specialties.length
          }
          className="inline-flex w-fit items-center gap-1 rounded-lg bg-white dark:bg-neutral-900 px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <PlusIcon className="size-4" /> Agregar
        </button>
      </fieldset>
    </Form>
  );
}
