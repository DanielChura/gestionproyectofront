import type { AreaWriteData } from "../../../../core/interfaces/organization.interface";
import { useFormArea } from "./useFormArea";
import Form from "../../../../shared/components/Form/Form";
import Input from "../../../../shared/components/Input/Input";

interface FormAreaProps {
  title: string;
  submitLabel: string;
  initialData: AreaWriteData;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: AreaWriteData) => void;
}

function FormArea({
  title,
  submitLabel,
  initialData,
  submitting,
  onClose,
  onSubmit,
}: FormAreaProps) {
  const { formData, updateField } = useFormArea(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      code: formData.code.trim(),
      name: formData.name.trim(),
      active: initialData.active ?? true,
    });
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
          Código de área
        </label>
        <Input
          id="area-code"
          name="code"
          type="text"
          value={formData.code}
          onChange={(e) => updateField("code", e.target.value)}
          placeholder="Ej. TI, MK, RRHH"
          required
        />
      </div>

      <div className="col-span-2 grid gap-1.5">
        <label className="text-xs text-neutral-800 dark:text-neutral-100">
          Nombre del área
        </label>
        <Input
          id="area-name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Ej. Tecnología e Innovación"
          required
        />
      </div>
    </Form>
  );
}

export default FormArea;
