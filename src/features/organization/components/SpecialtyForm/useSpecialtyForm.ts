import { useState } from "react";
import type { SpecialtyWriteData } from "../../../../core/interfaces/organization.interface";

export function useSpecialtyForm(initial: SpecialtyWriteData) {
  const [formData, setFormData] = useState<SpecialtyWriteData>(initial);

  const updateField = (field: keyof SpecialtyWriteData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return { formData, updateField };
}
