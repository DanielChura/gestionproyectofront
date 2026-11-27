import { useWorkerForm } from "./useWorkerForm";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";
import type { Area } from "../../../core/interfaces/organization.interface";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import { GMAIL_PATTERN, GMAIL_TITLE } from "../../../utils/gmail";

interface WorkerFormProps {
  worker: Worker;
  areas: Area[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: WorkerUpdateData) => void;
}

function WorkerForm({
  worker,
  areas,
  submitting,
  onClose,
  onSubmit,
}: WorkerFormProps) {
  const { formData, updateField, toUpdateData } = useWorkerForm(worker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toUpdateData());
  };

  return (
    <Form
      title="Editar trabajador"
      submitLabel="Guardar"
      submitting={submitting}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombres
        </label>
        <Input
          id="first_names"
          name="first_names"
          type="text"
          value={formData.first_names}
          onChange={(e) => updateField("first_names", e.target.value)}
          required
        />
      </div>

      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Apellidos
        </label>
        <Input
          id="last_names"
          name="last_names"
          type="text"
          value={formData.last_names}
          onChange={(e) => updateField("last_names", e.target.value)}
          required
        />
      </div>

      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Correo electrónico
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          pattern={GMAIL_PATTERN}
          title={GMAIL_TITLE}
          required
        />
      </div>

      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Horas por semana
        </label>
        <Input
          id="weekly_hours"
          name="weekly_hours"
          type="number"
          min="1"
          max="80"
          step="0.5"
          value={formData.weekly_hours}
          onChange={(e) => updateField("weekly_hours", e.target.value)}
          required
        />
      </div>

      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Área de adscripción
        </label>
        <Select
          id="area"
          name="area"
          value={formData.areaSelection}
          onChange={(e) => updateField("areaSelection", e.target.value)}
        >
          <option value="all">Todas las áreas</option>
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

export default WorkerForm;
