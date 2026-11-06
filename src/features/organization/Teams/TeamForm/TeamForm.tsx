import { useTeamForm } from "./useTeamForm";
import Form from "../../../../shared/Form/Form";
import Input from "../../../../shared/Input/Input";
import Select from "../../../../shared/Select/Select";
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
          Nombre
        </label>
        <Input
          id="team-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Área
        </label>
        <Select
          id="team-area"
          name="area"
          value={formData.area}
          onChange={(e) => updateField("area", e.target.value)}
          required
        >
          <option value="">Seleccionar área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>
      <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-800 dark:text-neutral-100 cursor-pointer">
        <input
          name="active"
          type="checkbox"
          checked={formData.active}
          onChange={(e) => updateField("active", e.target.checked)}
          className="accent-neutral-800 dark:accent-neutral-100 cursor-pointer"
        />
        <span>Activo</span>
      </label>
    </Form>
  );
}

export default TeamForm;
