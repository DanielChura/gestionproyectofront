import { useState } from "react";
import type { AreaWriteData } from "../../../../core/interfaces/organization.interface";

export function useFormArea(initial: AreaWriteData) {
  const [formData, setFormData] = useState<AreaWriteData>(initial);

  const updateField = (field: keyof AreaWriteData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, updateField };
}
