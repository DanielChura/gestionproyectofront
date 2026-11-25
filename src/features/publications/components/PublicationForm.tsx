import type {
  Publication,
  PublicationCatalogs,
  PublicationCreateData,
  PublicationUpdateData,
} from "../../../core/interfaces/publication.interface";
import Form from "../../../shared/components/Form/Form";
import Textarea from "../../../shared/components/Textarea/Textarea";
import { usePublicationForm } from "../hooks/usePublicationForm";
import PublicationFields from "./PublicationFields";
import PublicationMetaFields from "./PublicationMetaFields";
import RequirementFields from "./RequirementFields";

interface PublicationFormProps {
  publication?: Publication;
  catalogs: PublicationCatalogs;
  onClose: () => void;
  onSubmit: (
    payload: PublicationCreateData | PublicationUpdateData,
  ) => Promise<void>;
}

export default function PublicationForm({
  publication,
  catalogs,
  onClose,
  onSubmit,
}: PublicationFormProps) {
  const levels = catalogs.levels.length ? catalogs.levels : [1, 2, 3];
  const form = usePublicationForm(
    publication,
    catalogs.specialties,
    levels,
    onSubmit,
    onClose,
  );

  return (
    <Form
      title={publication ? "Editar publicación" : "Nueva publicación"}
      submitLabel="Guardar"
      size="lg"
      submitting={form.busy}
      onClose={onClose}
      onSubmit={form.submit}
    >
      <PublicationMetaFields
        publication={publication}
        catalogs={catalogs}
        projectId={form.draft.projectId}
        state={form.state}
        onProject={(value) => form.updateField("projectId", value)}
        onState={form.setState}
      />
      <PublicationFields
        draft={form.draft}
        closingMin={form.closingMin}
        onField={form.updateField}
      />
      <label className="col-span-2 grid gap-1.5">
        <span className="text-xs text-neutral-700 dark:text-neutral-100">
          Descripción
        </span>
        <Textarea
          name="description"
          rows={3}
          maxLength={10000}
          value={form.draft.description}
          placeholder="Descripción"
          onChange={(event) =>
            form.updateField("description", event.target.value)
          }
        />
      </label>
      <RequirementFields
        requirements={form.draft.requirements}
        specialties={catalogs.specialties}
        levels={levels}
        onChange={form.updateRequirement}
        onAdd={form.addRequirement}
        onRemove={form.removeRequirement}
        canAdd={
          form.draft.requirements.length <
          Math.min(50, catalogs.specialties.length)
        }
      />
    </Form>
  );
}
