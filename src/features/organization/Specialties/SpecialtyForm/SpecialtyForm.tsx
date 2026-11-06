import { useSpecialtyForm } from "./useSpecialtyForm";
import Form from "../../../../shared/Form/Form";
import Input from "../../../../shared/Input/Input";
import type { SpecialtyWriteData } from "../../../../core/interfaces/organization.interface";

interface SpecialtyFormProps {
  title: string;
  submitLabel: string;
  initialData: SpecialtyWriteData;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: SpecialtyWriteData) => void;
}

function SpecialtyForm({
  title,
  submitLabel,
  initialData,
  submitting,
  onClose,
  onSubmit,
}: SpecialtyFormProps) {
  const { formData, updateField } = useSpecialtyForm(initialData);

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
          Nombre
        </label>
        <Input
          id="specialty-name"
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

export default SpecialtyForm;
