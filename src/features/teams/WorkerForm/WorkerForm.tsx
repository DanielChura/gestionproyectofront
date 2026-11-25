import { useWorkerForm } from "./useWorkerForm";
import type { WorkerFormState } from "./useWorkerForm";
import type {
  Worker,
  WorkerUpdateData,
} from "../../../core/interfaces/worker.interface";
import type { Area } from "../../../core/interfaces/organization.interface";
import Form from "../../../shared/components/Form/Form";
import Input from "../../../shared/components/Input/Input";
import Select from "../../../shared/components/Select/Select";
import { GMAIL_PATTERN, GMAIL_TITLE } from "../../../utils/gmail";

interface TextField {
  name: Exclude<keyof WorkerFormState, "active" | "all_areas">;
  label: string;
  type: string;
  min?: string;
  max?: string;
}

const textFields: TextField[] = [
  { name: "first_names", label: "Nombres", type: "text" },
  { name: "last_names", label: "Apellidos", type: "text" },
  { name: "email", label: "Correo", type: "email" },
  { name: "code", label: "Código", type: "text" },
  {
    name: "weekly_hours",
    label: "Horas/sem",
    type: "number",
    min: "1",
    max: "80",
  },
];

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
      {textFields.map((field, index) => (
        <div
          key={field.name}
          className={index == 2 ? `col-span-2` : `col-span-1` + `grid gap-1.5`}
        >
          <label className="text-xs text-neutral-700 dark:text-neutral-100">
            {field.label}
          </label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            value={formData[field.name]}
            onChange={(e) => updateField(field.name, e.target.value)}
            min={field.min}
            max={field.max}
            pattern={field.type === "email" ? GMAIL_PATTERN : undefined}
            title={field.type === "email" ? GMAIL_TITLE : undefined}
            required
          />
        </div>
      ))}
      <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-100 cursor-pointer">
        <input
          name="all_areas"
          type="checkbox"
          checked={formData.all_areas}
          onChange={(e) => updateField("all_areas", e.target.checked)}
          className="accent-neutral-800 dark:accent-neutral-100 cursor-pointer"
        />
        <span>Acceso a todas las áreas</span>
      </label>
      <div className="col-span-1 grid gap-1.5">
        <label className="text-xs text-neutral-700 dark:text-neutral-100">
          Área
        </label>
        <Select
          id="area"
          name="area"
          value={formData.area}
          onChange={(e) => updateField("area", e.target.value)}
          disabled={formData.all_areas}
        >
          <option value="">Sin área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>
      <label className="col-span-2 flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-100 cursor-pointer">
        <input
          name="active"
          type="checkbox"
          checked={formData.active}
          onChange={(e) => updateField("active", e.target.checked)}
          className="accent-neutral-800 dark:accent-neutral-100 cursor-pointer"
        />
        <span>Trabajador activo</span>
      </label>
    </Form>
  );
}

export default WorkerForm;
