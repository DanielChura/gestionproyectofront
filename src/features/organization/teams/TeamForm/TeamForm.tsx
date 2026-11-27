import { useTeamForm } from "./useTeamForm";
import Form from "../../../../shared/components/Form/Form";
import Input from "../../../../shared/components/Input/Input";
import Select from "../../../../shared/components/Select/Select";
import type { TeamFormState } from "./useTeamForm";
import type {
  TeamWriteData,
  Area,
} from "../../../../core/interfaces/organization.interface";

interface TeamFormProps {
  title: string;
  submitLabel: string;
  initialData: TeamFormState;
  areas: Area[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: TeamWriteData) => void;
}

function TeamForm({
  title,
  submitLabel,
  initialData,
  areas,
  submitting,
  onClose,
  onSubmit,
}: TeamFormProps) {
  const { formData, updateField, toWriteData } = useTeamForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toWriteData());
  };

  return (
    <Form
      title={title}
      submitLabel={submitLabel}
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombre del equipo
        </label>
        <Input
          id="team-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Ej. Desarrollo Frontend"
          required
        />
      </div>

      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Área de adscripción
        </label>
        <Select
          id="team-area"
          name="area"
          value={formData.area}
          onChange={(e) => updateField("area", e.target.value)}
          required
        >
          <option value="">Seleccionar área...</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>
    </Form>
  );
}

export default TeamForm;
