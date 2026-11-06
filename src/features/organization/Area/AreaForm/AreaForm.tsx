import type { AreaWriteData } from "../../../../core/interfaces/organization.interface";
import { useAreaForm } from "./useAreaForm";
import Form from "../../../../shared/Form/Form";
import Input from "../../../../shared/Input/Input";

interface AreaFormProps {
  title: string;
  submitLabel: string;
  initialData: AreaWriteData;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: AreaWriteData) => void;
}

function AreaForm({
  title,
  submitLabel,
  initialData,
  submitting,
  onClose,
  onSubmit,
}: AreaFormProps) {
  const { formData, updateField } = useAreaForm(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
          Código
        </label>
        <Input
          id="area-code"
          name="code"
          type="text"
          value={formData.code}
          onChange={(e) => updateField("code", e.target.value)}
          required
        />
      </div>
      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombre
        </label>
        <Input
          id="area-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          required
        />
      </div>
    </Form>
  );
}

export default AreaForm;
